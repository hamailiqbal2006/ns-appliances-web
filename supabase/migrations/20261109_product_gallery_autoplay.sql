-- NS Home Appliances: Product Gallery Autoplay Settings
-- Adds configurable gallery auto-rotation and interval settings per product.
-- Run this in your Supabase SQL Editor.

begin;

alter table if exists public.products
  add column if not exists gallery_autoplay boolean not null default false,
  add column if not exists gallery_interval_seconds integer not null default 5 check (gallery_interval_seconds in (3, 5, 10));

comment on column public.products.gallery_autoplay is
  'Whether gallery photographs automatically rotate on the storefront product detail page.';

comment on column public.products.gallery_interval_seconds is
  'Automatic rotation interval in seconds (exactly 3, 5, or 10 seconds). Default is 5.';

commit;
