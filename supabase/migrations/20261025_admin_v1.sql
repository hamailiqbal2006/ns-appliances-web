-- NS Home Appliances admin portal, Version 1.
-- Run in the Supabase SQL Editor after creating a free project.
-- Authentication is owner-controlled: create invited users in Supabase Auth, then
-- explicitly promote only approved accounts to profiles.role = 'admin'.

create type public.product_status as enum ('draft', 'active', 'archived');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 160),
  category_slug text not null,
  subcategory_slug text not null,
  description text,
  specifications jsonb not null default '{}'::jsonb,
  price_pkr numeric(12,2) check (price_pkr is null or price_pkr >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  status public.product_status not null default 'draft',
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_settings (
  id boolean primary key default true check (id),
  store_name text not null default 'NS Home Appliances',
  phone text,
  email text,
  whatsapp text,
  address text,
  hours text,
  publish_contact_details boolean not null default false,
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();
create trigger products_set_updated_at before update on public.products
for each row execute procedure public.set_updated_at();
create trigger store_settings_set_updated_at before update on public.store_settings
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.store_settings enable row level security;

create policy "Users can read their own profile" on public.profiles
for select to authenticated using (id = auth.uid());

create policy "Admins manage products" on public.products
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admins manage store settings" on public.store_settings
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Public visitors may read only explicitly approved contact fields. No public
-- write policy exists, so unapproved contact data remains private.
create policy "Public reads published contact details" on public.store_settings
for select to anon, authenticated using (publish_contact_details = true);

-- The bucket is public only for displaying product images. Upload/update/delete still
-- require an authenticated approved admin through the policies below.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Admins upload product images" on storage.objects
for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());
create policy "Admins update product images" on storage.objects
for update to authenticated using (bucket_id = 'product-images' and public.is_admin()) with check (bucket_id = 'product-images' and public.is_admin());
create policy "Admins delete product images" on storage.objects
for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());

-- After creating the owner's Auth user in Supabase, run exactly one targeted promotion:
-- insert into public.profiles (id, email, full_name, role)
-- select id, email, 'Owner', 'admin' from auth.users where email = 'owner@example.com'
-- on conflict (id) do update set email = excluded.email, full_name = excluded.full_name, role = 'admin';
-- Do not add a public sign-up flow. Do not promote users from application code.
