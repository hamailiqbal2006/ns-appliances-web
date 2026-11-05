-- NS Home Appliances: exactly three managed homepage banner slots.
-- Run this after 20261025_admin_v1.sql. It preserves the approved CSS/GSAP
-- hero whenever no optional artwork is attached.

create table if not exists public.homepage_banners (
  slot_key text primary key check (slot_key in ('brand', 'climate', 'utility')),
  sort_order smallint not null check (sort_order between 0 and 2),
  image_path text,
  updated_at timestamptz not null default now(),
  constraint homepage_banners_sort_order_key unique (sort_order) deferrable initially deferred,
  constraint homepage_banners_image_path_check check (image_path is null or image_path ~ '^[a-z]+/[A-Za-z0-9][A-Za-z0-9._-]*$')
);

drop trigger if exists homepage_banners_set_updated_at on public.homepage_banners;
create trigger homepage_banners_set_updated_at before update on public.homepage_banners
for each row execute procedure public.set_updated_at();

alter table public.homepage_banners enable row level security;
drop policy if exists "Public reads homepage banners" on public.homepage_banners;
create policy "Public reads homepage banners" on public.homepage_banners for select to anon, authenticated using (true);
drop policy if exists "Admins update homepage banners" on public.homepage_banners;
create policy "Admins update homepage banners" on public.homepage_banners for update to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.homepage_banners to anon;
grant select, update on public.homepage_banners to authenticated;

insert into public.homepage_banners (slot_key, sort_order, image_path)
values ('brand', 0, null), ('climate', 1, null), ('utility', 2, null)
on conflict (slot_key) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('homepage-banners', 'homepage-banners', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public reads published homepage banner media" on storage.objects;
create policy "Public reads published homepage banner media" on storage.objects for select to anon, authenticated using (
  bucket_id = 'homepage-banners' and exists (select 1 from public.homepage_banners where homepage_banners.image_path = storage.objects.name)
);
drop policy if exists "Admins upload homepage banner media" on storage.objects;
create policy "Admins upload homepage banner media" on storage.objects for insert to authenticated with check (bucket_id = 'homepage-banners' and public.is_admin());
drop policy if exists "Admins update homepage banner media" on storage.objects;
create policy "Admins update homepage banner media" on storage.objects for update to authenticated using (bucket_id = 'homepage-banners' and public.is_admin()) with check (bucket_id = 'homepage-banners' and public.is_admin());
drop policy if exists "Admins delete homepage banner media" on storage.objects;
create policy "Admins delete homepage banner media" on storage.objects for delete to authenticated using (bucket_id = 'homepage-banners' and public.is_admin());

-- Atomic configuration updates permit a safe swap of two positions.
create or replace function public.update_homepage_banners(p_slots jsonb)
returns void language plpgsql security invoker set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if jsonb_typeof(p_slots) <> 'array' or jsonb_array_length(p_slots) <> 3 then raise exception 'Exactly three homepage banner slots are required'; end if;
  if exists (select 1 from jsonb_to_recordset(p_slots) as slot(slot_key text, sort_order integer, image_path text)
    where slot.slot_key not in ('brand', 'climate', 'utility') or slot.sort_order not between 0 and 2
      or (slot.image_path is not null and slot.image_path !~ '^[a-z]+/[A-Za-z0-9][A-Za-z0-9._-]*$')) then
    raise exception 'Invalid homepage banner configuration';
  end if;
  if (select count(distinct slot_key) from jsonb_to_recordset(p_slots) as slot(slot_key text, sort_order integer, image_path text)) <> 3
    or (select count(distinct sort_order) from jsonb_to_recordset(p_slots) as slot(slot_key text, sort_order integer, image_path text)) <> 3 then
    raise exception 'Homepage banner slots and orders must be unique';
  end if;
  update public.homepage_banners as banner
  set sort_order = incoming.sort_order, image_path = incoming.image_path
  from jsonb_to_recordset(p_slots) as incoming(slot_key text, sort_order smallint, image_path text)
  where banner.slot_key = incoming.slot_key;
end;
$$;
revoke all on function public.update_homepage_banners(jsonb) from public;
grant execute on function public.update_homepage_banners(jsonb) to authenticated;
