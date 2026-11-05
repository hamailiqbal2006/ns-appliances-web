-- NS Home Appliances: Customer Contact Inquiries & Admin Management
-- Version: 20261028_01
-- Safe to run in Supabase SQL Editor.

-- 1. Inquiries Table
create table if not exists public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(customer_name) between 1 and 120),
  customer_email text check (customer_email is null or char_length(customer_email) between 3 and 254),
  customer_phone text check (customer_phone is null or char_length(customer_phone) between 7 and 40),
  subject text check (subject is null or char_length(subject) <= 160),
  message text not null check (char_length(message) between 5 and 3000),
  status text not null default 'new' check (status in ('new', 'reviewed', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_inquiries_contact_method_check check (
    customer_email is not null or customer_phone is not null
  )
);

create index if not exists contact_inquiries_created_at_idx on public.contact_inquiries (created_at desc);
create index if not exists contact_inquiries_status_created_at_idx on public.contact_inquiries (status, created_at desc);

-- Trigger for updated_at
drop trigger if exists contact_inquiries_set_updated_at on public.contact_inquiries;
create trigger contact_inquiries_set_updated_at before update on public.contact_inquiries
for each row execute procedure public.set_updated_at();

-- 2. Row Level Security
alter table public.contact_inquiries enable row level security;

-- Only authenticated approved admins can view or modify customer inquiries
drop policy if exists "Admins manage inquiries" on public.contact_inquiries;
create policy "Admins manage inquiries" on public.contact_inquiries
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Anonymous users cannot read, update, or delete customer inquiry data
revoke all on table public.contact_inquiries from anon, authenticated;
grant select, update, delete on table public.contact_inquiries to authenticated;

-- 3. Secure Public Submission RPC
-- Limits submissions to prevent spam while protecting customer privacy
create or replace function public.submit_contact_inquiry(
  p_customer_name text,
  p_customer_email text default null,
  p_customer_phone text default null,
  p_message text default '',
  p_subject text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inquiry_id uuid;
  norm_name text := btrim(p_customer_name);
  norm_email text := nullif(lower(btrim(p_customer_email)), '');
  norm_phone text := nullif(btrim(p_customer_phone), '');
  norm_message text := btrim(p_message);
  norm_subject text := nullif(btrim(p_subject), '');
  recent_count integer;
begin
  -- Validate required fields
  if char_length(norm_name) < 1 or char_length(norm_name) > 120 then
    raise exception 'Customer name must be between 1 and 120 characters.';
  end if;

  if norm_email is null and norm_phone is null then
    raise exception 'At least one contact method (email or phone) is required.';
  end if;

  if norm_email is not null and (char_length(norm_email) < 3 or char_length(norm_email) > 254 or norm_email !~ '^.+@.+\..+$') then
    raise exception 'Please provide a valid email address.';
  end if;

  if norm_phone is not null and (char_length(norm_phone) < 7 or char_length(norm_phone) > 40) then
    raise exception 'Please provide a valid phone number.';
  end if;

  if char_length(norm_message) < 5 or char_length(norm_message) > 3000 then
    raise exception 'Message must be between 5 and 3000 characters.';
  end if;

  -- Rate limit: Maximum 5 inquiries per email or phone per hour
  if norm_email is not null then
    select count(*) into recent_count
    from public.contact_inquiries
    where customer_email = norm_email
      and created_at > now() - interval '1 hour';
    if recent_count >= 5 then
      raise exception 'Too many inquiries submitted recently. Please try again later.';
    end if;
  end if;

  if norm_phone is not null then
    select count(*) into recent_count
    from public.contact_inquiries
    where customer_phone = norm_phone
      and created_at > now() - interval '1 hour';
    if recent_count >= 5 then
      raise exception 'Too many inquiries submitted recently. Please try again later.';
    end if;
  end if;

  insert into public.contact_inquiries (
    customer_name,
    customer_email,
    customer_phone,
    subject,
    message,
    status
  ) values (
    norm_name,
    norm_email,
    norm_phone,
    norm_subject,
    norm_message,
    'new'
  )
  returning id into inquiry_id;

  return inquiry_id;
end;
$$;

revoke all on function public.submit_contact_inquiry from public, anon, authenticated;
grant execute on function public.submit_contact_inquiry to anon, authenticated;
