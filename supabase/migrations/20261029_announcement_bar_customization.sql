-- NS Home Appliances: Add theme, separator, and speed presets to announcement_bar_settings.
-- This migration is idempotent and preserves all existing messages and settings.

alter table public.announcement_bar_settings
  add column if not exists theme text not null default 'charcoal-graphite'
    check (theme in (
      'charcoal-graphite', 'deep-navy-teal', 'soft-black-blue', 'dark-olive-charcoal', 'warm-beige-stone',
      'ruby-red', 'crimson-sunset', 'golden-yellow', 'sunset-orange', 'rose-pink', 'royal-purple',
      'electric-blue', 'ocean-cyan', 'emerald-green', 'lime-energy', 'berry-fusion', 'festival-gradient'
    )),
  add column if not exists separator text not null default 'dot'
    check (separator in ('dot', 'diamond', 'star', 'slash')),
  add column if not exists speed text not null default 'normal'
    check (speed in ('slow', 'normal', 'fast'));

-- Drop the legacy 2-argument function to eliminate PostgREST / Postgres overload ambiguity
drop function if exists public.update_announcement_bar(boolean, jsonb);

-- Update or replace function to support the additional settings
create or replace function public.update_announcement_bar(
  p_enabled boolean,
  p_messages jsonb,
  p_theme text default 'charcoal-graphite',
  p_separator text default 'dot',
  p_speed text default 'normal'
)
returns void language plpgsql security invoker set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if jsonb_typeof(p_messages) <> 'array' or jsonb_array_length(p_messages) > 50 then
    raise exception 'Invalid announcement configuration';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_messages) as message(id uuid, message text, is_active boolean, sort_order integer)
    where message.message is null
      or char_length(message.message) not between 1 and 120
      or btrim(message.message) <> message.message
      or message.is_active is null
      or message.sort_order not between 0 and 49
  ) then
    raise exception 'Invalid announcement configuration';
  end if;
  if (select count(distinct sort_order) from jsonb_to_recordset(p_messages) as message(id uuid, message text, is_active boolean, sort_order integer))
      <> jsonb_array_length(p_messages)
    or (select count(distinct id) filter (where id is not null) from jsonb_to_recordset(p_messages) as message(id uuid, message text, is_active boolean, sort_order integer))
      <> (select count(id) from jsonb_to_recordset(p_messages) as message(id uuid, message text, is_active boolean, sort_order integer)) then
    raise exception 'Announcement order and IDs must be unique';
  end if;

  update public.announcement_bar_settings
  set enabled = p_enabled,
      theme = coalesce(p_theme, 'charcoal-graphite'),
      separator = coalesce(p_separator, 'dot'),
      speed = coalesce(p_speed, 'normal')
  where singleton;

  delete from public.announcement_bar_messages
  where id not in (
    select id from jsonb_to_recordset(p_messages) as message(id uuid, message text, is_active boolean, sort_order integer)
    where id is not null
  );
  update public.announcement_bar_messages as existing
  set message = incoming.message, is_active = incoming.is_active, sort_order = incoming.sort_order
  from jsonb_to_recordset(p_messages) as incoming(id uuid, message text, is_active boolean, sort_order smallint)
  where existing.id = incoming.id;
  insert into public.announcement_bar_messages (id, message, is_active, sort_order)
  select coalesce(incoming.id, gen_random_uuid()), incoming.message, incoming.is_active, incoming.sort_order
  from jsonb_to_recordset(p_messages) as incoming(id uuid, message text, is_active boolean, sort_order smallint)
  where not exists (select 1 from public.announcement_bar_messages as existing where existing.id = incoming.id);
end;
$$;

revoke all on function public.update_announcement_bar(boolean, jsonb, text, text, text) from public;
grant execute on function public.update_announcement_bar(boolean, jsonb, text, text, text) to authenticated;
