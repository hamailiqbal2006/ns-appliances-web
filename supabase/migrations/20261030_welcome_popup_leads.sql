-- NS Home Appliances: secure welcome-popup settings, media, and WhatsApp leads.
-- Safe to apply once through the Supabase SQL Editor. It deliberately seeds the
-- rollout disabled: public collection only starts after an owner enables it in Admin.

create table if not exists public.welcome_popup_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  eyebrow text not null default 'NS HOME APPLIANCES' check (char_length(eyebrow) between 1 and 60),
  headline text not null default 'WELCOME OFFER' check (char_length(headline) between 1 and 90),
  description text not null default 'Share your WhatsApp number for occasional showroom updates.' check (char_length(description) between 1 and 280),
  offer_text text check (offer_text is null or char_length(offer_text) between 1 and 180),
  button_label text not null default 'Get welcome offer' check (char_length(button_label) between 1 and 50),
  image_path text check (image_path is null or image_path ~ '^welcome/[A-Za-z0-9][A-Za-z0-9._-]*$'),
  image_alt text not null default 'NS Home Appliances welcome offer' check (char_length(image_alt) between 1 and 160),
  display_delay_seconds smallint not null default 10 check (display_delay_seconds between 0 and 600),
  updated_at timestamptz not null default now()
);

insert into public.welcome_popup_settings (singleton)
values (true)
on conflict (singleton) do nothing;

drop trigger if exists welcome_popup_settings_set_updated_at on public.welcome_popup_settings;
create trigger welcome_popup_settings_set_updated_at before update on public.welcome_popup_settings
for each row execute procedure public.set_updated_at();

alter table public.welcome_popup_settings enable row level security;
drop policy if exists "Public reads welcome popup settings" on public.welcome_popup_settings;
create policy "Public reads welcome popup settings" on public.welcome_popup_settings
for select to anon, authenticated using (singleton = true);
drop policy if exists "Admins manage welcome popup settings" on public.welcome_popup_settings;
create policy "Admins manage welcome popup settings" on public.welcome_popup_settings
for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on table public.welcome_popup_settings from anon, authenticated;
grant select on table public.welcome_popup_settings to anon;
grant select, update on table public.welcome_popup_settings to authenticated;

create table if not exists public.customer_leads (
  id uuid primary key default gen_random_uuid(),
  whatsapp_number text not null unique check (whatsapp_number ~ '^\+923[0-9]{9}$'),
  marketing_consent boolean not null default false,
  consent_at timestamptz,
  consent_version text,
  marketing_status text not null default 'none' check (marketing_status in ('none', 'invited', 'added', 'opted_out')),
  opted_out_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_leads_consent_timestamp_check check ((marketing_consent and consent_at is not null and consent_version is not null) or not marketing_consent),
  constraint customer_leads_opt_out_check check ((marketing_status = 'opted_out' and opted_out_at is not null and not marketing_consent) or marketing_status <> 'opted_out'),
  constraint customer_leads_group_status_requires_consent check (marketing_status not in ('invited', 'added') or marketing_consent)
);

create index if not exists customer_leads_created_at_idx on public.customer_leads (created_at desc);
create index if not exists customer_leads_marketing_consent_idx on public.customer_leads (marketing_consent, created_at desc);

drop trigger if exists customer_leads_set_updated_at on public.customer_leads;
create trigger customer_leads_set_updated_at before update on public.customer_leads
for each row execute procedure public.set_updated_at();

alter table public.customer_leads enable row level security;
drop policy if exists "Admins manage customer leads" on public.customer_leads;
create policy "Admins manage customer leads" on public.customer_leads
for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on table public.customer_leads from anon, authenticated;
grant select, update, delete on table public.customer_leads to authenticated;

-- The browser only receives a generic success response from this narrow RPC.
-- It cannot select, insert, update, or infer a lead directly.
create or replace function public.submit_welcome_lead(
  p_whatsapp_number text,
  p_marketing_consent boolean default false,
  p_consent_version text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_phone text := btrim(p_whatsapp_number);
  normalized_consent_version text := nullif(btrim(p_consent_version), '');
begin
  if normalized_phone !~ '^\+923[0-9]{9}$' then
    raise exception 'Please enter a valid Pakistani WhatsApp mobile number.';
  end if;
  if p_marketing_consent and (normalized_consent_version is null or char_length(normalized_consent_version) > 80) then
    raise exception 'Invalid marketing consent.';
  end if;

  -- Database-side replay control complements the server action's per-IP window.
  -- It returns the same void response, so a repeat cannot reveal whether a lead exists.
  if exists (
    select 1 from public.customer_leads
    where whatsapp_number = normalized_phone and updated_at > now() - interval '15 minutes'
  ) then
    return;
  end if;

  insert into public.customer_leads (
    whatsapp_number, marketing_consent, consent_at, consent_version, marketing_status
  ) values (
    normalized_phone,
    coalesce(p_marketing_consent, false),
    case when coalesce(p_marketing_consent, false) then now() else null end,
    case when coalesce(p_marketing_consent, false) then normalized_consent_version else null end,
    'none'
  )
  on conflict (whatsapp_number) do update
  set
    -- A repeat submission never overrides a previous opt-out, and an unchecked
    -- box never removes a prior affirmative consent.
    marketing_consent = case
      when customer_leads.marketing_status = 'opted_out' then false
      else customer_leads.marketing_consent or excluded.marketing_consent
    end,
    consent_at = case
      when customer_leads.marketing_status = 'opted_out' then customer_leads.consent_at
      else coalesce(customer_leads.consent_at, excluded.consent_at)
    end,
    consent_version = case
      when customer_leads.marketing_status = 'opted_out' then customer_leads.consent_version
      else coalesce(customer_leads.consent_version, excluded.consent_version)
    end;
end;
$$;
revoke all on function public.submit_welcome_lead(text, boolean, text) from public, anon, authenticated;
grant execute on function public.submit_welcome_lead(text, boolean, text) to anon, authenticated;

create or replace function public.update_welcome_popup_settings(
  p_enabled boolean,
  p_eyebrow text,
  p_headline text,
  p_description text,
  p_offer_text text,
  p_button_label text,
  p_image_path text,
  p_image_alt text,
  p_display_delay_seconds smallint
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if char_length(btrim(p_eyebrow)) not between 1 and 60
    or char_length(btrim(p_headline)) not between 1 and 90
    or char_length(btrim(p_description)) not between 1 and 280
    or char_length(btrim(p_button_label)) not between 1 and 50
    or char_length(btrim(p_image_alt)) not between 1 and 160
    or p_display_delay_seconds not between 0 and 600
    or (nullif(btrim(p_offer_text), '') is not null and char_length(btrim(p_offer_text)) > 180)
    or (nullif(btrim(p_image_path), '') is not null and btrim(p_image_path) !~ '^welcome/[A-Za-z0-9][A-Za-z0-9._-]*$')
  then raise exception 'Invalid welcome popup configuration'; end if;

  update public.welcome_popup_settings
  set enabled = p_enabled,
      eyebrow = btrim(p_eyebrow),
      headline = btrim(p_headline),
      description = btrim(p_description),
      offer_text = nullif(btrim(p_offer_text), ''),
      button_label = btrim(p_button_label),
      image_path = nullif(btrim(p_image_path), ''),
      image_alt = btrim(p_image_alt),
      display_delay_seconds = p_display_delay_seconds
  where singleton = true;
end;
$$;
revoke all on function public.update_welcome_popup_settings(boolean, text, text, text, text, text, text, text, smallint) from public;
grant execute on function public.update_welcome_popup_settings(boolean, text, text, text, text, text, text, text, smallint) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('welcome-popup-media', 'welcome-popup-media', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public reads published welcome popup media" on storage.objects;
create policy "Public reads published welcome popup media" on storage.objects for select to anon, authenticated using (
  bucket_id = 'welcome-popup-media'
  and exists (select 1 from public.welcome_popup_settings where singleton and image_path = storage.objects.name)
);
drop policy if exists "Admins upload welcome popup media" on storage.objects;
create policy "Admins upload welcome popup media" on storage.objects for insert to authenticated with check (bucket_id = 'welcome-popup-media' and public.is_admin());
drop policy if exists "Admins update welcome popup media" on storage.objects;
create policy "Admins update welcome popup media" on storage.objects for update to authenticated using (bucket_id = 'welcome-popup-media' and public.is_admin()) with check (bucket_id = 'welcome-popup-media' and public.is_admin());
drop policy if exists "Admins delete welcome popup media" on storage.objects;
create policy "Admins delete welcome popup media" on storage.objects for delete to authenticated using (bucket_id = 'welcome-popup-media' and public.is_admin());
