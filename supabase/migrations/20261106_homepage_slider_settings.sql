-- NS Home Appliances: Homepage Banner Slider Settings
-- Adds persistent configuration for the number of banners to display and transition interval.
--
-- This migration is strictly non-destructive:
--   * Creates public.homepage_banner_settings singleton table.
--   * Adds is_enabled column to public.homepage_banners (default true).
--   * Updates slot and sort order constraints to support dynamic/extended banner entries.
--   * Updates update_homepage_banners RPC function to support flexible banner arrays.
--   * Configures RLS policies for public read and admin-only management.
--
-- Run this in your Supabase SQL Editor.

begin;

-- 1. Create singleton homepage_banner_settings table
create table if not exists public.homepage_banner_settings (
  singleton boolean primary key default true check (singleton),
  banner_count smallint not null default 3 check (banner_count between 1 and 10),
  interval_seconds smallint not null default 5 check (interval_seconds between 2 and 30),
  updated_at timestamptz not null default now()
);

comment on table public.homepage_banner_settings is
  'Authoritative singleton settings for homepage hero banner slider quantity and rotation interval.';

-- 2. Trigger for updated_at on homepage_banner_settings
drop trigger if exists homepage_banner_settings_set_updated_at on public.homepage_banner_settings;
create trigger homepage_banner_settings_set_updated_at before update on public.homepage_banner_settings
for each row execute procedure public.set_updated_at();

-- 3. Seed default singleton settings record
insert into public.homepage_banner_settings (singleton, banner_count, interval_seconds)
values (true, 3, 5)
on conflict (singleton) do nothing;

-- 4. Enable Row Level Security (RLS)
alter table public.homepage_banner_settings enable row level security;

-- Public read policy (anon and authenticated visitors can read settings to render the hero)
drop policy if exists "Public reads homepage banner settings" on public.homepage_banner_settings;
create policy "Public reads homepage banner settings" on public.homepage_banner_settings
for select to anon, authenticated using (true);

-- Admin-only update policy
drop policy if exists "Admins update homepage banner settings" on public.homepage_banner_settings;
create policy "Admins update homepage banner settings" on public.homepage_banner_settings
for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Admin-only insert policy
drop policy if exists "Admins insert homepage banner settings" on public.homepage_banner_settings;
create policy "Admins insert homepage banner settings" on public.homepage_banner_settings
for insert to authenticated with check (public.is_admin());

-- Grant table permissions
grant select on public.homepage_banner_settings to anon;
grant select, insert, update on public.homepage_banner_settings to authenticated;

-- 5. Add is_enabled column to homepage_banners if not already present
alter table public.homepage_banners
  add column if not exists is_enabled boolean not null default true;

comment on column public.homepage_banners.is_enabled is
  'Controls whether this banner slot is active in the rotation.';

-- 6. Relax slot_key and sort_order constraints on homepage_banners to allow flexible banner management
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'homepage_banners_slot_key_check') then
    alter table public.homepage_banners drop constraint homepage_banners_slot_key_check;
  end if;
  if exists (select 1 from pg_constraint where conname = 'homepage_banners_sort_order_check') then
    alter table public.homepage_banners drop constraint homepage_banners_sort_order_check;
  end if;
end;
$$;

alter table public.homepage_banners
  add constraint homepage_banners_slot_key_check check (slot_key ~ '^[a-z0-9_-]{2,40}$');

alter table public.homepage_banners
  add constraint homepage_banners_sort_order_check check (sort_order between 0 and 19);

-- 7. Update update_homepage_banners RPC function to accept flexible array sizes (1 to 20 slots)
create or replace function public.update_homepage_banners(p_slots jsonb)
returns void language plpgsql security invoker set search_path = public
as $$
declare
  slot_count integer;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if jsonb_typeof(p_slots) <> 'array' then raise exception 'Homepage banner configuration must be an array'; end if;
  
  slot_count := jsonb_array_length(p_slots);
  if slot_count < 1 or slot_count > 20 then
    raise exception 'Homepage banner configuration must contain between 1 and 20 slots';
  end if;

  if exists (
    select 1 from jsonb_to_recordset(p_slots) as slot(
      slot_key text,
      sort_order integer,
      image_path text,
      mobile_image_path text,
      is_enabled boolean
    )
    where slot.slot_key !~ '^[a-z0-9_-]{2,40}$'
      or slot.sort_order not between 0 and 19
      or (slot.image_path is not null and slot.image_path !~ '^[a-z]+/[A-Za-z0-9][A-Za-z0-9._-]*$')
      or (slot.mobile_image_path is not null and slot.mobile_image_path !~ '^[a-z]+/[A-Za-z0-9][A-Za-z0-9._-]*$')
  ) then
    raise exception 'Invalid homepage banner configuration';
  end if;

  if (select count(distinct slot_key) from jsonb_to_recordset(p_slots) as slot(slot_key text)) <> slot_count
    or (select count(distinct sort_order) from jsonb_to_recordset(p_slots) as slot(sort_order integer)) <> slot_count then
    raise exception 'Homepage banner slots and orders must be unique';
  end if;

  update public.homepage_banners as b
  set
    sort_order = s.sort_order,
    image_path = s.image_path,
    mobile_image_path = s.mobile_image_path,
    is_enabled = coalesce(s.is_enabled, true)
  from jsonb_to_recordset(p_slots) as s(
    slot_key text,
    sort_order integer,
    image_path text,
    mobile_image_path text,
    is_enabled boolean
  )
  where b.slot_key = s.slot_key;
end;
$$;

commit;
