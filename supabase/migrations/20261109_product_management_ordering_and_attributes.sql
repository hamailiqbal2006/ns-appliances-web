-- Migration: 20261109_product_management_ordering_and_attributes.sql
-- Description: Adds sort_order for category-specific ordering, category attributes (washing capacity, juicer config), and review author token hash.

begin;

-- 1. Category-specific product ordering
alter table if exists public.products
  add column if not exists sort_order integer default 0;

comment on column public.products.sort_order is
  'Manual display order within its primary category_slug (0-indexed).';

create index if not exists idx_products_category_sort
  on public.products (category_slug, sort_order asc, updated_at desc);

-- 2. Category-specific product attributes
alter table if exists public.products
  add column if not exists washing_capacity numeric default null,
  add column if not exists juicer_configuration text default null;

comment on column public.products.washing_capacity is
  'Washing machine capacity in kilograms (e.g. 8, 10, 12).';

comment on column public.products.juicer_configuration is
  'Juicer and blender configuration (e.g. 1-in-1, 2-in-1, 3-in-1, 4-in-1).';

-- 3. Review author receipt token hash for private pending visibility
alter table if exists public.product_reviews
  add column if not exists author_token_hash text default null;

create index if not exists idx_product_reviews_author_token
  on public.product_reviews (author_token_hash)
  where author_token_hash is not null;

commit;

