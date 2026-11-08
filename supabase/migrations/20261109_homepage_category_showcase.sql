-- NS Home Appliances: Homepage Category Showcase Customizer
-- Version: 20261109
-- Run this in your Supabase SQL Editor.

begin;

create table if not exists public.homepage_category_showcase (
  id uuid primary key default gen_random_uuid(),
  category_slug text not null unique check (category_slug in ('cooling', 'laundry', 'kitchen-everyday', 'home')),
  display_heading text,
  sort_order integer not null default 0,
  left_bg_type text not null default 'solid' check (left_bg_type in ('solid', 'gradient')),
  left_bg_color text not null default '#e8ece9',
  left_gradient_end text default '#d8dcd9',
  left_gradient_angle integer not null default 135,
  right_bg_type text not null default 'solid' check (right_bg_type in ('solid', 'gradient')),
  right_bg_color text not null default '#163f45',
  right_gradient_end text default '#0d282c',
  right_gradient_angle integer not null default 135,
  image_path text,
  image_scale numeric not null default 1.0 check (image_scale between 0.75 and 1.25),
  image_x numeric not null default 0 check (image_x between -15 and 15),
  image_y numeric not null default 0 check (image_y between -15 and 15),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Triggers for updated_at
drop trigger if exists category_showcase_set_updated_at on public.homepage_category_showcase;
create trigger category_showcase_set_updated_at before update on public.homepage_category_showcase
for each row execute procedure public.set_updated_at();

-- Row Level Security
alter table public.homepage_category_showcase enable row level security;

drop policy if exists "Public reads category showcase" on public.homepage_category_showcase;
create policy "Public reads category showcase" on public.homepage_category_showcase
for select to anon, authenticated using (true);

drop policy if exists "Admins manage category showcase" on public.homepage_category_showcase;
create policy "Admins manage category showcase" on public.homepage_category_showcase
for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.homepage_category_showcase to anon, authenticated;
grant insert, update, delete on public.homepage_category_showcase to authenticated;

-- Seed approved default rows
insert into public.homepage_category_showcase (
  category_slug, display_heading, sort_order,
  left_bg_type, left_bg_color, left_gradient_end, left_gradient_angle,
  right_bg_type, right_bg_color, right_gradient_end, right_gradient_angle,
  image_path, image_scale, image_x, image_y
)
values
  ('cooling', 'Cooling', 0, 'solid', '#e8ece9', '#d8dcd9', 135, 'solid', '#163f45', '#0d282c', 135, null, 1.0, 0, 0),
  ('laundry', 'Laundry', 1, 'solid', '#ede8df', '#dfd9cd', 135, 'solid', '#7e2e39', '#571d26', 135, null, 1.0, 0, 0),
  ('kitchen-everyday', 'Kitchen & Everyday', 2, 'solid', '#f1eddf', '#e4ded0', 135, 'solid', '#596044', '#3d432d', 135, null, 1.0, 0, 0),
  ('home', 'Home', 3, 'solid', '#e7e4df', '#d8d4cd', 135, 'solid', '#25282a', '#141617', 135, null, 1.0, 0, 0)
on conflict (category_slug) do nothing;

commit;

