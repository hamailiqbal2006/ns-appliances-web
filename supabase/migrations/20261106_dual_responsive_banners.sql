-- NS Home Appliances: Dual Desktop and Mobile Homepage Banner System
--
-- Extends the three managed homepage banner slots with an independent mobile
-- artwork path (mobile_image_path) alongside the existing desktop artwork path (image_path).
--
-- This migration is strictly non-destructive:
--   * Preserves all existing banner rows ('brand', 'climate', 'utility').
--   * Preserves all existing desktop image paths and sort orders.
--   * Mobile image is nullable; when absent, public storefront safely falls back to desktop artwork.
--   * Preserves RLS policies and admin-only write permissions.
--
-- Run this in the Supabase SQL Editor for your project.

begin;

-- 1. Add mobile_image_path column if not already present
alter table public.homepage_banners
  add column if not exists mobile_image_path text;

comment on column public.homepage_banners.mobile_image_path is
  'Storage path for mobile-specific banner artwork (recommended 1080 × 1920 px, 9:16 aspect ratio). When null, mobile viewports fall back to image_path.';

-- 2. Add check constraint for safe storage path format
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'homepage_banners_mobile_image_path_check'
  ) then
    alter table public.homepage_banners
      add constraint homepage_banners_mobile_image_path_check
      check (mobile_image_path is null or mobile_image_path ~ '^[a-z]+/[A-Za-z0-9][A-Za-z0-9._-]*$');
  end if;
end;
$$;

-- 3. Update public read policy on storage.objects to permit both desktop and mobile published media
drop policy if exists "Public reads published homepage banner media" on storage.objects;
create policy "Public reads published homepage banner media" on storage.objects for select to anon, authenticated using (
  bucket_id = 'homepage-banners' and exists (
    select 1 from public.homepage_banners
    where homepage_banners.image_path = storage.objects.name
       or homepage_banners.mobile_image_path = storage.objects.name
  )
);

-- 4. Update the atomic update_homepage_banners RPC function to handle both desktop and mobile image paths
create or replace function public.update_homepage_banners(p_slots jsonb)
returns void language plpgsql security invoker set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if jsonb_typeof(p_slots) <> 'array' or jsonb_array_length(p_slots) <> 3 then raise exception 'Exactly three homepage banner slots are required'; end if;

  if exists (
    select 1 from jsonb_to_recordset(p_slots) as slot(
      slot_key text,
      sort_order integer,
      image_path text,
      mobile_image_path text
    )
    where slot.slot_key not in ('brand', 'climate', 'utility')
      or slot.sort_order not between 0 and 2
      or (slot.image_path is not null and slot.image_path !~ '^[a-z]+/[A-Za-z0-9][A-Za-z0-9._-]*$')
      or (slot.mobile_image_path is not null and slot.mobile_image_path !~ '^[a-z]+/[A-Za-z0-9][A-Za-z0-9._-]*$')
  ) then
    raise exception 'Invalid homepage banner configuration';
  end if;

  if (select count(distinct slot_key) from jsonb_to_recordset(p_slots) as slot(slot_key text, sort_order integer, image_path text, mobile_image_path text)) <> 3
    or (select count(distinct sort_order) from jsonb_to_recordset(p_slots) as slot(slot_key text, sort_order integer, image_path text, mobile_image_path text)) <> 3 then
    raise exception 'Homepage banner slots and orders must be unique';
  end if;

  update public.homepage_banners as banner
  set sort_order = incoming.sort_order,
      image_path = incoming.image_path,
      mobile_image_path = incoming.mobile_image_path
  from jsonb_to_recordset(p_slots) as incoming(
    slot_key text,
    sort_order smallint,
    image_path text,
    mobile_image_path text
  )
  where banner.slot_key = incoming.slot_key;
end;
$$;

revoke all on function public.update_homepage_banners(jsonb) from public;
grant execute on function public.update_homepage_banners(jsonb) to authenticated;

commit;

-- Verification Query (Run to confirm):
-- select slot_key, sort_order, image_path, mobile_image_path, updated_at from public.homepage_banners order by sort_order asc;
