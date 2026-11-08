-- NS Home Appliances: Homepage Banner System Redesign
-- Upgrades banner management to support up to 10 banners with arbitrary slots, titles, and unified atomic persistence.
--
-- This migration is strictly non-destructive:
--   * Adds title column to public.homepage_banners.
--   * Sets meaningful default titles for existing legacy slots ('brand', 'climate', 'utility').
--   * Relaxes slot_key constraints to support dynamic/user-created banner IDs (e.g. 'banner-1', 'promo-dry-iron').
--   * Relaxes image_path and mobile_image_path constraints to allow alphanumeric slot prefixes.
--   * Grants full CRUD (INSERT, UPDATE, DELETE) on homepage_banners to authenticated admins.
--   * Upgrades public.update_homepage_banners RPC to atomically synchronize slots (upserting provided slots and removing deleted ones).
--
-- Run this in your Supabase SQL Editor.

begin;

-- 1. Add title column to homepage_banners if not already present
alter table public.homepage_banners
  add column if not exists title text;

comment on column public.homepage_banners.title is
  'Descriptive human-readable title or campaign name for the banner (e.g., "Laundry Made Simple").';

-- 2. Populate titles for existing default rows if null
update public.homepage_banners
set title = 'Brand Ambience'
where slot_key = 'brand' and (title is null or title = '');

update public.homepage_banners
set title = 'Climate Care'
where slot_key = 'climate' and (title is null or title = '');

update public.homepage_banners
set title = 'Laundry Made Simple'
where slot_key = 'utility' and (title is null or title = '');

-- 3. Relax constraints to allow arbitrary dynamic slot keys (1 to 10 banners)
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'homepage_banners_slot_key_check') then
    alter table public.homepage_banners drop constraint homepage_banners_slot_key_check;
  end if;
  if exists (select 1 from pg_constraint where conname = 'homepage_banners_sort_order_check') then
    alter table public.homepage_banners drop constraint homepage_banners_sort_order_check;
  end if;
  if exists (select 1 from pg_constraint where conname = 'homepage_banners_image_path_check') then
    alter table public.homepage_banners drop constraint homepage_banners_image_path_check;
  end if;
  if exists (select 1 from pg_constraint where conname = 'homepage_banners_mobile_image_path_check') then
    alter table public.homepage_banners drop constraint homepage_banners_mobile_image_path_check;
  end if;
  if exists (select 1 from pg_constraint where conname = 'homepage_banners_sort_order_key') then
    alter table public.homepage_banners drop constraint homepage_banners_sort_order_key;
  end if;
end;
$$;

alter table public.homepage_banners
  add constraint homepage_banners_slot_key_check check (slot_key ~ '^[a-z0-9_-]{2,60}$');

alter table public.homepage_banners
  add constraint homepage_banners_sort_order_check check (sort_order between 0 and 19);

alter table public.homepage_banners
  add constraint homepage_banners_image_path_check check (image_path is null or image_path ~ '^[a-z0-9_-]+/[A-Za-z0-9][A-Za-z0-9._-]*$');

alter table public.homepage_banners
  add constraint homepage_banners_mobile_image_path_check check (mobile_image_path is null or mobile_image_path ~ '^[a-z0-9_-]+/[A-Za-z0-9][A-Za-z0-9._-]*$');

-- 4. Enable full Admin CRUD policies on homepage_banners
drop policy if exists "Admins insert homepage banners" on public.homepage_banners;
create policy "Admins insert homepage banners" on public.homepage_banners
for insert to authenticated with check (public.is_admin());

drop policy if exists "Admins delete homepage banners" on public.homepage_banners;
create policy "Admins delete homepage banners" on public.homepage_banners
for delete to authenticated using (public.is_admin());

grant select on public.homepage_banners to anon;
grant select, insert, update, delete on public.homepage_banners to authenticated;

-- 5. Atomic RPC function to reconcile all homepage banners (insert, update, delete)
create or replace function public.update_homepage_banners(p_slots jsonb)
returns void language plpgsql security invoker set search_path = public
as $$
declare
  slot_count integer;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if jsonb_typeof(p_slots) <> 'array' then raise exception 'Homepage banner configuration must be an array'; end if;
  
  slot_count := jsonb_array_length(p_slots);
  if slot_count < 1 or slot_count > 10 then
    raise exception 'Homepage banner configuration must contain between 1 and 10 banners';
  end if;

  if exists (
    select 1 from jsonb_to_recordset(p_slots) as slot(
      slot_key text,
      sort_order integer,
      image_path text,
      mobile_image_path text,
      is_enabled boolean,
      title text
    )
    where slot.slot_key !~ '^[a-z0-9_-]{2,60}$'
      or slot.sort_order not between 0 and 19
      or (slot.image_path is not null and slot.image_path !~ '^[a-z0-9_-]+/[A-Za-z0-9][A-Za-z0-9._-]*$')
      or (slot.mobile_image_path is not null and slot.mobile_image_path !~ '^[a-z0-9_-]+/[A-Za-z0-9][A-Za-z0-9._-]*$')
  ) then
    raise exception 'Invalid homepage banner configuration payload';
  end if;

  if (select count(distinct slot_key) from jsonb_to_recordset(p_slots) as slot(slot_key text)) <> slot_count
    or (select count(distinct sort_order) from jsonb_to_recordset(p_slots) as slot(sort_order integer)) <> slot_count then
    raise exception 'Homepage banner slots and display orders must be unique';
  end if;

  -- Upsert all incoming slots
  insert into public.homepage_banners (slot_key, sort_order, image_path, mobile_image_path, is_enabled, title, updated_at)
  select
    s.slot_key,
    s.sort_order,
    s.image_path,
    s.mobile_image_path,
    coalesce(s.is_enabled, true),
    coalesce(nullif(trim(s.title), ''), 'Banner ' || (s.sort_order + 1)),
    now()
  from jsonb_to_recordset(p_slots) as s(
    slot_key text,
    sort_order integer,
    image_path text,
    mobile_image_path text,
    is_enabled boolean,
    title text
  )
  on conflict (slot_key) do update set
    sort_order = excluded.sort_order,
    image_path = excluded.image_path,
    mobile_image_path = excluded.mobile_image_path,
    is_enabled = excluded.is_enabled,
    title = excluded.title,
    updated_at = now();

  -- Delete any banners that are no longer present in the incoming payload
  delete from public.homepage_banners
  where slot_key not in (
    select s.slot_key
    from jsonb_to_recordset(p_slots) as s(slot_key text)
  );
end;
$$;

revoke all on function public.update_homepage_banners(jsonb) from public;
grant execute on function public.update_homepage_banners(jsonb) to authenticated;

commit;
