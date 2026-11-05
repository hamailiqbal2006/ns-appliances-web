-- ==============================================================================
-- NS Home Appliances — Product Availability Architecture Migration
-- ==============================================================================
-- Adds explicit showroom availability control to distinguish:
--   1. 'available': Confirmed in stock.
--   2. 'out_of_stock': Explicitly unavailable.
--   3. 'not_confirmed': Stock unverified/untracked. Allows store-visit request with WhatsApp verification.
--
-- Makes stock_quantity nullable so untracked / showroom display items do not default to 0.
-- ==============================================================================

-- 1. Add availability_status column to public.products
alter table public.products
  add column if not exists availability_status text not null default 'not_confirmed'
  check (availability_status in ('available', 'out_of_stock', 'not_confirmed'));

-- 2. Make stock_quantity nullable so untracked stock is not forced to 0
alter table public.products
  alter column stock_quantity drop not null;

alter table public.products
  alter column stock_quantity set default null;

-- 3. Populate existing products safely:
-- Verified products with positive stock are marked 'available'
update public.products
set availability_status = 'available'
where stock_quantity is not null and stock_quantity > 0 and availability_status = 'not_confirmed';

-- Products where stock was never configured (e.g. newly created products)
-- have stock_quantity cleared to NULL and remain 'not_confirmed'
update public.products
set stock_quantity = null
where slug in ('fan', 'ns-semi-automatic-washing-machine-model-to-be-confirmed')
  and coalesce(stock_quantity, 0) = 0;

-- 4. Create an index for availability queries
create index if not exists products_availability_status_idx on public.products (availability_status);

-- ==============================================================================
-- 5. Update Reservation Submission RPCs to Respect Availability Status
-- ==============================================================================

create or replace function public.submit_store_reservation(
  p_product_id uuid,
  p_whatsapp_number text,
  p_token_hash text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  normalized_phone text := regexp_replace(p_whatsapp_number, '[\s\-\(\)]', '', 'g');
  selected_product record;
  v_lead_id uuid;
  v_reservation_id uuid;
  v_reservation_ref text;
  v_token_id uuid;
begin
  if normalized_phone !~ '^\+923[0-9]{9}$' then
    raise exception 'Please enter a valid Pakistani WhatsApp mobile number.';
  end if;

  -- Verify active product and real availability
  select id, name, price_pkr, stock_quantity, availability_status into selected_product
  from public.products
  where id = p_product_id and status = 'active';

  if selected_product.id is null then
    raise exception 'This appliance is no longer available for store visit reservation.';
  end if;

  -- Block only if explicitly marked out of stock
  if selected_product.availability_status = 'out_of_stock' then
    raise exception 'This appliance is currently out of stock for store visit reservations.';
  end if;

  -- Rate limit per phone number (max 4 per 2 hours)
  if (select count(*) from public.reservations where whatsapp_number = normalized_phone and created_at > now() - interval '2 hours') >= 4 then
    raise exception 'Too many reservation requests. Please wait before submitting again.';
  end if;

  -- Find or register customer lead
  select id into v_lead_id from public.customer_leads where whatsapp_number = normalized_phone;
  if v_lead_id is null then
    insert into public.customer_leads (whatsapp_number, marketing_consent, marketing_status)
    values (normalized_phone, false, 'none')
    returning id into v_lead_id;
  end if;

  -- If token hash was provided, link token
  if p_token_hash is not null and char_length(p_token_hash) = 64 then
    insert into public.customer_tokens (customer_lead_id, token_hash, expires_at)
    values (v_lead_id, p_token_hash, now() + interval '180 days')
    on conflict (token_hash) do update
      set customer_lead_id = v_lead_id,
          last_used_at = now(),
          expires_at = now() + interval '180 days'
    returning id into v_token_id;
  end if;

  -- Generate human-readable reference
  v_reservation_ref := 'NS-RES-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

  insert into public.reservations (
    product_id,
    product_name,
    customer_lead_id,
    whatsapp_number,
    status,
    customer_name,
    quantity,
    reservation_ref,
    admin_notes
  )
  values (
    selected_product.id,
    selected_product.name,
    v_lead_id,
    normalized_phone,
    'pending',
    normalized_phone,
    1,
    v_reservation_ref,
    case when selected_product.availability_status = 'not_confirmed'
      then 'Showroom stock unconfirmed at time of request. Verify floor stock before approving.'
      else null
    end
  )
  returning id into v_reservation_id;

  return jsonb_build_object(
    'ok', true,
    'reservation_id', v_reservation_id,
    'reservation_ref', v_reservation_ref,
    'product_name', selected_product.name,
    'availability_status', selected_product.availability_status,
    'message', 'Reservation request submitted successfully.'
  );
end;
$$;

create or replace function public.submit_recognized_store_reservation(
  p_product_id uuid,
  p_token_hash text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_lead_id uuid;
  v_whatsapp text;
  selected_product record;
  v_reservation_id uuid;
  v_reservation_ref text;
begin
  if p_token_hash is null or char_length(p_token_hash) != 64 then
    return jsonb_build_object('ok', false, 'unrecognized', true, 'message', 'Invalid customer recognition token.');
  end if;

  -- Resolve recognized customer
  select t.customer_lead_id, l.whatsapp_number into v_lead_id, v_whatsapp
  from public.customer_tokens t
  join public.customer_leads l on l.id = t.customer_lead_id
  where t.token_hash = p_token_hash and t.expires_at > now();

  if v_lead_id is null or v_whatsapp is null then
    return jsonb_build_object('ok', false, 'unrecognized', true, 'message', 'Customer not recognized.');
  end if;

  -- Verify active product and availability
  select id, name, price_pkr, stock_quantity, availability_status into selected_product
  from public.products
  where id = p_product_id and status = 'active';

  if selected_product.id is null then
    return jsonb_build_object('ok', false, 'message', 'This appliance is no longer available for store visit reservation.');
  end if;

  if selected_product.availability_status = 'out_of_stock' then
    return jsonb_build_object('ok', false, 'message', 'This appliance is currently out of stock for store visit reservations.');
  end if;

  -- Refresh token last used timestamp
  update public.customer_tokens
  set last_used_at = now()
  where token_hash = p_token_hash;

  -- Generate human-readable reference
  v_reservation_ref := 'NS-RES-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

  insert into public.reservations (
    product_id,
    product_name,
    customer_lead_id,
    whatsapp_number,
    status,
    customer_name,
    quantity,
    reservation_ref,
    admin_notes
  )
  values (
    selected_product.id,
    selected_product.name,
    v_lead_id,
    v_whatsapp,
    'pending',
    v_whatsapp,
    1,
    v_reservation_ref,
    case when selected_product.availability_status = 'not_confirmed'
      then 'Showroom stock unconfirmed at time of request. Verify floor stock before approving.'
      else null
    end
  )
  returning id into v_reservation_id;

  return jsonb_build_object(
    'ok', true,
    'reservation_id', v_reservation_id,
    'reservation_ref', v_reservation_ref,
    'product_name', selected_product.name,
    'availability_status', selected_product.availability_status,
    'whatsapp_number', v_whatsapp,
    'message', 'Store visit reservation confirmed.'
  );
end;
$$;

-- 6. Update admin approval RPC: guard against approving out of stock items
create or replace function public.admin_approve_reservation(
  p_reservation_id uuid,
  p_admin_notes text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_prod_id uuid;
  v_avail text;
  v_hold_hours int;
begin
  select product_id into v_prod_id from public.reservations where id = p_reservation_id;

  if v_prod_id is not null then
    select availability_status into v_avail from public.products where id = v_prod_id and status = 'active';
    if v_avail = 'out_of_stock' then
      raise exception 'Cannot approve reservation: Product is currently marked out of stock. Please update product availability first.';
    end if;
  end if;

  select coalesce(reservation_hold_hours, 48) into v_hold_hours from public.store_settings where id = true;

  update public.reservations
  set status = 'approved',
      decision_at = now(),
      hold_until = now() + (coalesce(v_hold_hours, 48) || ' hours')::interval,
      admin_notes = coalesce(p_admin_notes, admin_notes),
      updated_at = now()
  where id = p_reservation_id;
end;
$$;
