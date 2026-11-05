-- NS Home Appliances public catalog and reservation requests.
-- Run this after 20261025_admin_v1.sql. It is safe to re-run in the SQL Editor.

-- Active is the explicit public-published product state. Draft and archived rows
-- remain invisible to anonymous visitors even if their identifiers are guessed.
drop policy if exists "Public reads active products" on public.products;
create policy "Public reads active products" on public.products
for select to anon, authenticated using (status = 'active');

-- Do not rely on Supabase's project-default grants. The anonymous role can
-- only select rows permitted by the active-product RLS policy; authenticated
-- users need write privileges for the separate admin-only policy in V1.
grant select on public.products to anon;
grant select, insert, update, delete on public.products to authenticated;
grant select on public.profiles to authenticated;
grant select on public.store_settings to anon;
grant select, insert, update, delete on public.store_settings to authenticated;

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null check (char_length(product_name) between 1 and 160),
  customer_name text not null check (char_length(customer_name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  phone text not null check (char_length(phone) between 7 and 40),
  message text check (message is null or char_length(message) <= 1000),
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reservations_created_at_idx on public.reservations (created_at desc);
create index if not exists reservations_status_created_at_idx on public.reservations (status, created_at desc);
create index if not exists reservations_email_created_at_idx on public.reservations (email, created_at desc);

drop trigger if exists reservations_set_updated_at on public.reservations;
create trigger reservations_set_updated_at before update on public.reservations
for each row execute procedure public.set_updated_at();

alter table public.reservations enable row level security;

-- No anonymous SELECT/INSERT/UPDATE/DELETE policy is created. PII is visible
-- only to authenticated approved admins; customer writes go through the narrow
-- RPC below instead of a generic table insert policy.
drop policy if exists "Admins manage reservations" on public.reservations;
create policy "Admins manage reservations" on public.reservations
for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on table public.reservations from anon, authenticated;
-- Authenticated users receive only the operations needed by the protected admin
-- views. RLS still permits those operations exclusively to public.is_admin().
grant select, update on table public.reservations to authenticated;

create or replace function public.submit_reservation_request(
  p_product_id uuid,
  p_customer_name text,
  p_email text,
  p_phone text,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  reservation_id uuid;
  selected_product_name text;
  normalized_email text := lower(btrim(p_email));
begin
  -- Serialize checks for one address so concurrent calls cannot bypass the
  -- per-email limit between the count and insert.
  perform pg_advisory_xact_lock(hashtextextended(normalized_email, 0));

  if p_customer_name is null or char_length(btrim(p_customer_name)) not between 1 and 120 then
    raise exception 'Invalid customer name';
  end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or char_length(normalized_email) > 254 then
    raise exception 'Invalid email';
  end if;
  if p_phone is null or btrim(p_phone) !~ '^[0-9+(). -]{7,40}$' then
    raise exception 'Invalid phone';
  end if;
  if p_message is not null and char_length(btrim(p_message)) > 1000 then
    raise exception 'Message is too long';
  end if;

  -- Product visibility is checked again in the database to prevent a crafted
  -- Server Action request from reserving a draft or archived product.
  select name into selected_product_name
  from public.products
  where id = p_product_id and status = 'active';
  if selected_product_name is null then
    raise exception 'Product is not available for reservation';
  end if;

  -- A second, shared free-tier safeguard that survives multiple app instances.
  if (select count(*) from public.reservations where email = normalized_email and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'Too many requests';
  end if;

  insert into public.reservations (product_id, product_name, customer_name, email, phone, message)
  values (p_product_id, selected_product_name, btrim(p_customer_name), normalized_email, btrim(p_phone), nullif(btrim(p_message), ''))
  returning id into reservation_id;
  return reservation_id;
end;
$$;

revoke all on function public.submit_reservation_request(uuid, text, text, text, text) from public;
grant execute on function public.submit_reservation_request(uuid, text, text, text, text) to anon, authenticated;

-- The RPC intentionally has no public listing endpoint. The Next.js Server
-- Action adds same-origin checks, a honeypot, validation, and an in-memory
-- per-IP limit. For a multi-region production deployment, place a durable
-- rate limiter or CAPTCHA in front of this endpoint before treating it as a
-- high-volume public form.
