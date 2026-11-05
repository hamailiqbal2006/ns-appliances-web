-- NS Home Appliances: Multi-Image Product Gallery and Genuine Customer Reviews
-- Version: 20261027_02
-- Run in the Supabase SQL Editor after 20261027_categories_management.sql.

-- 1. Product Images Table
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add column non-destructively if table already exists
alter table if exists public.product_images
  add column if not exists media_type text not null default 'image' check (media_type in ('image', 'video'));

create index if not exists product_images_product_id_idx on public.product_images (product_id, sort_order asc);

-- Triggers for updated_at
drop trigger if exists product_images_set_updated_at on public.product_images;
create trigger product_images_set_updated_at before update on public.product_images
for each row execute procedure public.set_updated_at();

-- RLS for product_images
alter table public.product_images enable row level security;

-- Public can view images for active products
drop policy if exists "Public reads product images" on public.product_images;
create policy "Public reads product images" on public.product_images
for select to anon, authenticated using (
  exists (
    select 1 from public.products
    where products.id = product_images.product_id and products.status = 'active'
  )
);

-- Admins manage all product images
drop policy if exists "Admins manage product images" on public.product_images;
create policy "Admins manage product images" on public.product_images
for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.product_images to anon;
grant select, insert, update, delete on public.product_images to authenticated;


-- 2. Customer Reviews Table
do $$ begin
  create type public.review_status as enum ('pending', 'approved', 'rejected');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  customer_name text not null check (char_length(customer_name) between 1 and 120),
  customer_email text check (customer_email is null or char_length(customer_email) <= 254),
  rating integer not null check (rating between 1 and 5),
  review_text text not null check (char_length(review_text) between 5 and 2000),
  status public.review_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_reviews_product_id_status_idx on public.product_reviews (product_id, status, created_at desc);
create index if not exists product_reviews_status_idx on public.product_reviews (status, created_at desc);

-- Triggers for updated_at
drop trigger if exists product_reviews_set_updated_at on public.product_reviews;
create trigger product_reviews_set_updated_at before update on public.product_reviews
for each row execute procedure public.set_updated_at();

-- RLS for product_reviews
alter table public.product_reviews enable row level security;

-- Public can only read APPROVED reviews
drop policy if exists "Public reads approved reviews" on public.product_reviews;
create policy "Public reads approved reviews" on public.product_reviews
for select to anon, authenticated using (status = 'approved');

-- Admins manage all reviews
drop policy if exists "Admins manage reviews" on public.product_reviews;
create policy "Admins manage reviews" on public.product_reviews
for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.product_reviews to anon;
grant select, update, delete on public.product_reviews to authenticated;

-- Narrow RPC for public review submission so public never gets generic insert rights and submissions are guaranteed 'pending'
create or replace function public.submit_product_review(
  p_product_id uuid,
  p_customer_name text,
  p_rating integer,
  p_review_text text,
  p_customer_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_review_id uuid;
  v_product_exists boolean;
  v_normalized_email text := nullif(lower(btrim(p_customer_email)), '');
begin
  if p_customer_name is null or char_length(btrim(p_customer_name)) not between 1 and 120 then
    raise exception 'Invalid customer name';
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'Rating must be between 1 and 5';
  end if;
  if p_review_text is null or char_length(btrim(p_review_text)) not between 5 and 2000 then
    raise exception 'Review text must be between 5 and 2000 characters';
  end if;
  if v_normalized_email is not null and (v_normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or char_length(v_normalized_email) > 254) then
    raise exception 'Invalid email address';
  end if;

  -- Ensure product exists and is active
  select exists(
    select 1 from public.products where id = p_product_id and status = 'active'
  ) into v_product_exists;

  if not v_product_exists then
    raise exception 'Product not found or not active';
  end if;

  -- Insert review in pending status
  insert into public.product_reviews (
    product_id, customer_name, customer_email, rating, review_text, status
  ) values (
    p_product_id, btrim(p_customer_name), v_normalized_email, p_rating, btrim(p_review_text), 'pending'
  ) returning id into v_review_id;

  return v_review_id;
end;
$$;

revoke all on function public.submit_product_review(uuid, text, integer, text, text) from public;
grant execute on function public.submit_product_review(uuid, text, integer, text, text) to anon, authenticated;
