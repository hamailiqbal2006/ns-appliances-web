-- NS Home Appliances: Category Management and Product Schema Expansion.
-- Version: 20261027
-- Run this in the Supabase SQL Editor after 20261025_reservations_and_public_catalog.sql.

-- 1. Create categories table
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  editorial_group text not null check (editorial_group in ('cooling', 'laundry', 'kitchen-everyday', 'home')),
  display_order integer not null default 0,
  is_active boolean not null default true,
  subcategories jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Triggers for updated_at
drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at before update on public.categories
for each row execute procedure public.set_updated_at();

-- 3. Row Level Security for categories
alter table public.categories enable row level security;

-- Public visitors may read active categories
drop policy if exists "Public reads active categories" on public.categories;
create policy "Public reads active categories" on public.categories
for select to anon, authenticated using (is_active = true);

-- Approved administrators can manage all categories
drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories" on public.categories
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Grants
grant select on public.categories to anon;
grant select, insert, update, delete on public.categories to authenticated;

-- 4. Extend products table with optional metadata columns (additive and non-destructive)
alter table public.products add column if not exists brand text;
alter table public.products add column if not exists model_number text;
alter table public.products add column if not exists image_urls text[] default array[]::text[];

create index if not exists products_category_slug_idx on public.products (category_slug);
create index if not exists products_subcategory_slug_idx on public.products (subcategory_slug);
create index if not exists products_status_idx on public.products (status);

-- 5. Seed the 9 approved NS Home Appliances categories on first installation.
-- Never overwrite a category an administrator has subsequently customized.
insert into public.categories (name, slug, description, editorial_group, display_order, is_active, subcategories)
values
  (
    'Iron Machines',
    'iron-machines',
    'High-grade dry and steam pressing irons built for everyday fabric care.',
    'kitchen-everyday',
    1,
    true,
    '[{"name": "Dry Irons", "slug": "dry-irons"}, {"name": "Steam Irons", "slug": "steam-irons"}]'::jsonb
  ),
  (
    'Washing Machines',
    'washing-machines',
    'Heavy-duty washing machines engineered for superior fabric wash and longevity.',
    'laundry',
    2,
    true,
    '[{"name": "Single Tub Washer", "slug": "single-tub"}, {"name": "Twin Tub Washer", "slug": "twin-tub"}, {"name": "Automatic Washer", "slug": "automatic"}]'::jsonb
  ),
  (
    'Dryer Machines',
    'dryer-machines',
    'High-RPM spin dryers and fast drying solutions for delicate and heavy clothing.',
    'laundry',
    3,
    true,
    '[{"name": "Spin Dryer", "slug": "spin-dryer"}]'::jsonb
  ),
  (
    'Room Coolers',
    'room-coolers',
    'Powerful desert and plastic air room coolers for peak summer heat relief.',
    'cooling',
    4,
    true,
    '[{"name": "Plastic Body Cooler", "slug": "plastic-body"}, {"name": "Metal Body Desert Cooler", "slug": "metal-body"}]'::jsonb
  ),
  (
    'Juicer Blenders',
    'juicer-blenders',
    'Multi-functional kitchen blenders, spice grinders, and juice extractors.',
    'kitchen-everyday',
    5,
    true,
    '[{"name": "Juicer Blender — 2-in-1", "slug": "2-in-1"}, {"name": "Juicer Blender — 3-in-1", "slug": "3-in-1"}, {"name": "Juicer Blender — 4-in-1", "slug": "4-in-1"}]'::jsonb
  ),
  (
    'Pedestal Fans',
    'pedestal-fans',
    'High-velocity stand fans with pure copper windings and oscillation control.',
    'cooling',
    6,
    true,
    '[{"name": "Standard Pedestal Fan", "slug": "standard-pedestal"}, {"name": "Inverter DC Pedestal Fan", "slug": "inverter-pedestal"}]'::jsonb
  ),
  (
    'Ceiling Fans',
    'ceiling-fans',
    'Energy-efficient ceiling fans offering maximum air delivery and quiet performance.',
    'cooling',
    7,
    true,
    '[{"name": "Deluxe AC Ceiling Fan", "slug": "deluxe-model"}, {"name": "Inverter BLDC Ceiling Fan", "slug": "inverter-model"}]'::jsonb
  ),
  (
    'Geysers',
    'geysers',
    'Instant, electric, and gas water heaters designed for maximum safety and winter comfort.',
    'home',
    8,
    true,
    '[{"name": "Instant Gas Geyser", "slug": "instant-geyser"}, {"name": "Electric Storage Geyser", "slug": "electric-geyser"}, {"name": "Dual Gas & Electric Geyser", "slug": "dual-geyser"}]'::jsonb
  ),
  (
    'Metal Safe Almirahs',
    'metal-safe-almirahs',
    'Reinforced steel wardrobes and secure tijori lockers for reliable household protection.',
    'home',
    9,
    true,
    '[{"name": "Single Door Almirah", "slug": "single-door"}, {"name": "Double Door Almirah", "slug": "double-door"}, {"name": "Locker Safe / Tijori", "slug": "locker-safe"}]'::jsonb
  )
on conflict (slug) do nothing;
