-- NS Home Appliances: owner-managed homepage announcement bar.
-- This intentionally seeds no messages. The public bar remains hidden until
-- an administrator saves at least one active announcement.

create table if not exists public.announcement_bar_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default true,
  theme text not null default 'charcoal-graphite' check (theme in (
    'charcoal-graphite', 'deep-navy-teal', 'soft-black-blue', 'dark-olive-charcoal', 'warm-beige-stone',
    'ruby-red', 'crimson-sunset', 'golden-yellow', 'sunset-orange', 'rose-pink', 'royal-purple',
    'electric-blue', 'ocean-cyan', 'emerald-green', 'lime-energy', 'berry-fusion', 'festival-gradient'
  )),
  separator text not null default 'dot' check (separator in ('dot', 'diamond', 'star', 'slash')),
  speed text not null default 'normal' check (speed in ('slow', 'normal', 'fast')),
  updated_at timestamptz not null default now()
);

create table if not exists public.announcement_bar_messages (
  id uuid primary key default gen_random_uuid(),
  message text not null check (char_length(message) between 1 and 120 and btrim(message) = message),
  is_active boolean not null default true,
  sort_order smallint not null check (sort_order between 0 and 49),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint announcement_bar_messages_sort_order_key unique (sort_order) deferrable initially deferred
);

drop trigger if exists announcement_bar_settings_set_updated_at on public.announcement_bar_settings;
create trigger announcement_bar_settings_set_updated_at before update on public.announcement_bar_settings
for each row execute procedure public.set_updated_at();

drop trigger if exists announcement_bar_messages_set_updated_at on public.announcement_bar_messages;
create trigger announcement_bar_messages_set_updated_at before update on public.announcement_bar_messages
for each row execute procedure public.set_updated_at();

insert into public.announcement_bar_settings (singleton, enabled)
values (true, true)
on conflict (singleton) do nothing;

alter table public.announcement_bar_settings enable row level security;
alter table public.announcement_bar_messages enable row level security;

drop policy if exists "Public reads announcement bar settings" on public.announcement_bar_settings;
create policy "Public reads announcement bar settings" on public.announcement_bar_settings
for select to anon, authenticated using (true);
drop policy if exists "Admins manage announcement bar settings" on public.announcement_bar_settings;
create policy "Admins manage announcement bar settings" on public.announcement_bar_settings
for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public reads enabled announcement messages" on public.announcement_bar_messages;
create policy "Public reads enabled announcement messages" on public.announcement_bar_messages
for select to anon, authenticated using (
  is_active and exists (
    select 1 from public.announcement_bar_settings
    where singleton and enabled
  )
);
drop policy if exists "Admins manage announcement messages" on public.announcement_bar_messages;
create policy "Admins manage announcement messages" on public.announcement_bar_messages
for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.announcement_bar_settings, public.announcement_bar_messages to anon;
grant select, update on public.announcement_bar_settings to authenticated;
grant select, insert, update, delete on public.announcement_bar_messages to authenticated;

-- Atomically saves the global toggle, custom appearance, plus the complete ordered list. Deleting
-- omitted IDs makes removal explicit without allowing anonymous writes.
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
