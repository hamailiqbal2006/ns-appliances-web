-- NS Home Appliances: Complete Product Reservation System & Customer Recognition (Phase 2)
-- Idempotent, safe migration. Can be executed multiple times safely in Supabase SQL Editor.

-- 1. Customer Recognition Tokens Table
create table if not exists public.customer_tokens (
  token_hash text primary key,
  customer_lead_id uuid not null references public.customer_leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '180 days')
);

create index if not exists customer_tokens_lead_id_idx on public.customer_tokens (customer_lead_id);
create index if not exists customer_tokens_expires_at_idx on public.customer_tokens (expires_at);

alter table public.customer_tokens enable row level security;
drop policy if exists "Admins manage customer tokens" on public.customer_tokens;
create policy "Admins manage customer tokens" on public.customer_tokens
for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on table public.customer_tokens from anon, authenticated;
grant select, delete on table public.customer_tokens to authenticated;

-- 2. Enhance Store Settings Table with Map Location & Reservation Defaults
alter table public.store_settings
  add column if not exists google_maps_url text,
  add column if not exists reservation_hold_hours smallint default 48 check (reservation_hold_hours between 1 and 168),
  add column if not exists reservation_template text;

-- 3. Enhance Reservations Table with WhatsApp number, reference code, status & decision fields
alter table public.reservations
  add column if not exists reservation_ref text unique,
  add column if not exists whatsapp_number text,
  add column if not exists quantity integer not null default 1 check (quantity >= 1),
  add column if not exists customer_lead_id uuid references public.customer_leads(id) on delete set null,
  add column if not exists admin_notes text,
  add column if not exists denial_reason text,
  add column if not exists whatsapp_sent boolean not null default false,
  add column if not exists whatsapp_sent_at timestamptz,
  add column if not exists decision_at timestamptz,
  add column if not exists holding_deadline timestamptz;

-- Make older fields nullable for new WhatsApp-only reservation flow
alter table public.reservations alter column customer_name drop not null;
alter table public.reservations alter column email drop not null;
alter table public.reservations alter column phone drop not null;

-- Update status constraint to support pending, approved, denied, expired, completed (plus legacy values)
alter table public.reservations drop constraint if exists reservations_status_check;
alter table public.reservations add constraint reservations_status_check
  check (status in ('pending', 'approved', 'denied', 'expired', 'completed', 'new', 'contacted', 'closed'));

alter table public.reservations alter column status set default 'pending';

create index if not exists reservations_ref_idx on public.reservations (reservation_ref);
create index if not exists reservations_whatsapp_idx on public.reservations (whatsapp_number, created_at desc);
create index if not exists reservations_lead_id_idx on public.reservations (customer_lead_id);

-- 4. RPC: Register / Link Browser Token to Customer Lead
create or replace function public.register_customer_token(
  p_whatsapp_number text,
  p_token_hash text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_phone text := btrim(p_whatsapp_number);
  v_lead_id uuid;
begin
  if normalized_phone !~ '^\+923[0-9]{9}$' then
    raise exception 'Invalid phone format';
  end if;
  if p_token_hash is null or char_length(p_token_hash) < 16 then
    raise exception 'Invalid token';
  end if;

  select id into v_lead_id from public.customer_leads where whatsapp_number = normalized_phone;
  if v_lead_id is null then
    insert into public.customer_leads (whatsapp_number, marketing_consent, marketing_status)
    values (normalized_phone, false, 'none')
    returning id into v_lead_id;
  end if;

  insert into public.customer_tokens (token_hash, customer_lead_id, last_used_at, expires_at)
  values (p_token_hash, v_lead_id, now(), now() + interval '180 days')
  on conflict (token_hash) do update
  set customer_lead_id = v_lead_id,
      last_used_at = now(),
      expires_at = now() + interval '180 days';
end;
$$;
revoke all on function public.register_customer_token(text, text) from public, anon, authenticated;
grant execute on function public.register_customer_token(text, text) to anon, authenticated;

-- 5. RPC: Public Store Reservation Submission (New Visitor)
create or replace function public.submit_store_reservation(
  p_product_id uuid,
  p_whatsapp_number text,
  p_token_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_phone text := btrim(p_whatsapp_number);
  selected_product record;
  v_lead_id uuid;
  v_reservation_id uuid;
  v_reservation_ref text;
begin
  if normalized_phone !~ '^\+923[0-9]{9}$' then
    raise exception 'Please enter a valid Pakistani WhatsApp mobile number.';
  end if;

  -- Verify active product and real stock availability
  select id, name, price_pkr, stock_quantity into selected_product
  from public.products
  where id = p_product_id and status = 'active';

  if selected_product.id is null then
    raise exception 'This appliance is no longer available for store visit reservation.';
  end if;

  if coalesce(selected_product.stock_quantity, 0) <= 0 then
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

  -- Generate human-readable reference: NS-RES-XXXX
  v_reservation_ref := 'NS-RES-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

  -- Insert reservation
  insert into public.reservations (
    product_id,
    product_name,
    customer_name,
    phone,
    whatsapp_number,
    quantity,
    customer_lead_id,
    reservation_ref,
    status
  ) values (
    selected_product.id,
    selected_product.name,
    'Customer (' || right(normalized_phone, 4) || ')',
    normalized_phone,
    normalized_phone,
    1,
    v_lead_id,
    v_reservation_ref,
    'pending'
  )
  returning id into v_reservation_id;

  -- Link token if provided
  if p_token_hash is not null and char_length(p_token_hash) >= 16 then
    insert into public.customer_tokens (token_hash, customer_lead_id, last_used_at, expires_at)
    values (p_token_hash, v_lead_id, now(), now() + interval '180 days')
    on conflict (token_hash) do update
    set customer_lead_id = v_lead_id,
        last_used_at = now(),
        expires_at = now() + interval '180 days';
  end if;

  return jsonb_build_object(
    'ok', true,
    'reservation_id', v_reservation_id,
    'reservation_ref', v_reservation_ref,
    'product_name', selected_product.name,
    'status', 'pending'
  );
end;
$$;
revoke all on function public.submit_store_reservation(uuid, text, text) from public, anon, authenticated;
grant execute on function public.submit_store_reservation(uuid, text, text) to anon, authenticated;

-- 6. RPC: Public Store Reservation Submission (Recognized Returning Customer)
create or replace function public.submit_recognized_store_reservation(
  p_product_id uuid,
  p_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead_id uuid;
  v_whatsapp text;
  selected_product record;
  v_reservation_id uuid;
  v_reservation_ref text;
begin
  if p_token_hash is null or char_length(p_token_hash) < 16 then
    return jsonb_build_object('ok', false, 'unrecognized', true, 'message', 'Invalid recognition token.');
  end if;

  -- Validate active unexpired token
  select t.customer_lead_id, l.whatsapp_number
  into v_lead_id, v_whatsapp
  from public.customer_tokens t
  join public.customer_leads l on l.id = t.customer_lead_id
  where t.token_hash = p_token_hash and t.expires_at > now();

  if v_lead_id is null or v_whatsapp is null then
    return jsonb_build_object('ok', false, 'unrecognized', true, 'message', 'Customer not recognized.');
  end if;

  -- Verify active product and stock
  select id, name, price_pkr, stock_quantity into selected_product
  from public.products
  where id = p_product_id and status = 'active';

  if selected_product.id is null then
    return jsonb_build_object('ok', false, 'message', 'This appliance is no longer available for store visit reservation.');
  end if;

  if coalesce(selected_product.stock_quantity, 0) <= 0 then
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
    customer_name,
    phone,
    whatsapp_number,
    quantity,
    customer_lead_id,
    reservation_ref,
    status
  ) values (
    selected_product.id,
    selected_product.name,
    'Customer (' || right(v_whatsapp, 4) || ')',
    v_whatsapp,
    v_whatsapp,
    1,
    v_lead_id,
    v_reservation_ref,
    'pending'
  )
  returning id into v_reservation_id;

  return jsonb_build_object(
    'ok', true,
    'reservation_id', v_reservation_id,
    'reservation_ref', v_reservation_ref,
    'product_name', selected_product.name,
    'status', 'pending'
  );
end;
$$;
revoke all on function public.submit_recognized_store_reservation(uuid, text) from public, anon, authenticated;
grant execute on function public.submit_recognized_store_reservation(uuid, text) to anon, authenticated;

-- 7. Admin Operations (Approval, Denial, WhatsApp tracking, Completion)
create or replace function public.admin_approve_reservation(
  p_reservation_id uuid,
  p_admin_notes text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_hold_hours smallint;
  v_prod_id uuid;
  v_stock int;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;

  select product_id into v_prod_id from public.reservations where id = p_reservation_id;
  if v_prod_id is null then raise exception 'Reservation not found'; end if;

  -- Re-verify stock before approving
  select stock_quantity into v_stock from public.products where id = v_prod_id and status = 'active';
  if v_stock is not null and v_stock <= 0 then
    raise exception 'Cannot approve reservation: Product is out of stock.';
  end if;

  select coalesce(reservation_hold_hours, 48) into v_hold_hours from public.store_settings where id = true;

  update public.reservations
  set status = 'approved',
      decision_at = now(),
      admin_notes = coalesce(p_admin_notes, admin_notes),
      holding_deadline = now() + (coalesce(v_hold_hours, 48) || ' hours')::interval,
      updated_at = now()
  where id = p_reservation_id;
end;
$$;
revoke all on function public.admin_approve_reservation(uuid, text) from public;
grant execute on function public.admin_approve_reservation(uuid, text) to authenticated;

create or replace function public.admin_deny_reservation(
  p_reservation_id uuid,
  p_denial_reason text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;

  update public.reservations
  set status = 'denied',
      decision_at = now(),
      denial_reason = p_denial_reason,
      updated_at = now()
  where id = p_reservation_id;
end;
$$;
revoke all on function public.admin_deny_reservation(uuid, text) from public;
grant execute on function public.admin_deny_reservation(uuid, text) to authenticated;

create or replace function public.admin_mark_reservation_whatsapp_sent(
  p_reservation_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;

  update public.reservations
  set whatsapp_sent = true,
      whatsapp_sent_at = now(),
      updated_at = now()
  where id = p_reservation_id;
end;
$$;
revoke all on function public.admin_mark_reservation_whatsapp_sent(uuid) from public;
grant execute on function public.admin_mark_reservation_whatsapp_sent(uuid) to authenticated;

create or replace function public.admin_complete_reservation(
  p_reservation_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;

  update public.reservations
  set status = 'completed',
      updated_at = now()
  where id = p_reservation_id;
end;
$$;
revoke all on function public.admin_complete_reservation(uuid) from public;
grant execute on function public.admin_complete_reservation(uuid) to authenticated;
