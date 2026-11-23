-- Execute once before deploying the direct showcase and banner upload code.
-- New, narrowly scoped SELECT policies; no data or existing policies are removed.
begin;

drop policy if exists "Admins read draft banner media" on storage.objects;
create policy "Admins read draft banner media" on storage.objects
  for select to authenticated
  using (bucket_id = 'homepage-banners' and public.is_admin());

drop policy if exists "Public reads referenced category showcase media" on storage.objects;
create policy "Public reads referenced category showcase media" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'product-images'
    and name like 'category-showcase/%'
    and exists (
      select 1 from public.homepage_category_showcase as showcase
      where showcase.image_path = storage.objects.name
    )
  );

-- Banner rows and slider settings must succeed or roll back together.
create or replace function public.save_homepage_banner_configuration(
  p_slots jsonb, p_banner_count integer, p_interval_seconds integer
) returns void language plpgsql security invoker set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if jsonb_typeof(p_slots) is distinct from 'array' then
    raise exception 'Invalid banner configuration';
  end if;
  if jsonb_array_length(p_slots) not between 1 and 10
    or p_banner_count is null or p_banner_count not between 1 and 10
    or p_interval_seconds is null or p_interval_seconds not between 2 and 30 then
    raise exception 'Invalid banner settings';
  end if;
  lock table public.homepage_banners in share row exclusive mode;
  set constraints homepage_banners_sort_order_key deferred;
  delete from public.homepage_banners as existing
    where not exists (select 1 from jsonb_array_elements(p_slots) as supplied
      where supplied->>'slot_key' = existing.slot_key);
  perform public.update_homepage_banners(p_slots);
  insert into public.homepage_banner_settings (singleton, banner_count, interval_seconds)
    values (true, p_banner_count, p_interval_seconds)
    on conflict (singleton) do update set banner_count = excluded.banner_count,
      interval_seconds = excluded.interval_seconds;
end;
$$;
revoke all on function public.save_homepage_banner_configuration(jsonb, integer, integer) from public;
grant execute on function public.save_homepage_banner_configuration(jsonb, integer, integer) to authenticated;

commit;
