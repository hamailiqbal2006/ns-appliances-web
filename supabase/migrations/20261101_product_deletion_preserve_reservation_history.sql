-- NS Home Appliances: allow permanent catalog-product deletion without losing
-- historical reservation evidence.
--
-- This migration is intentionally non-destructive:
--   * it does not delete or cascade-delete reservations;
--   * every linked reservation receives an immutable catalog snapshot first;
--   * product_id becomes nullable and uses ON DELETE SET NULL afterwards.
--
-- Run this once in the Supabase SQL Editor for project fscwyfttowtazwaaaszu.
-- It is safe to re-run. Review the verification query at the bottom before and
-- after applying it; do not run this as a substitute for deleting a product.

begin;

alter table public.reservations
  add column if not exists product_snapshot jsonb;

comment on column public.reservations.product_snapshot is
  'Immutable catalog evidence captured before a referenced product is permanently deleted.';

-- Backfill a full catalog snapshot while every existing reservation still has a
-- valid product reference. product_name is retained separately for compatibility.
update public.reservations as reservation
set product_snapshot = jsonb_build_object(
  'captured_at', now(),
  'product', to_jsonb(product)
)
from public.products as product
where reservation.product_id = product.id
  and reservation.product_snapshot is null;

-- Refuse to weaken the foreign key if any linked reservation could not be
-- snapshotted. This protects audit evidence rather than silently proceeding.
do $$
begin
  if exists (
    select 1
    from public.reservations
    where product_id is not null
      and product_snapshot is null
  ) then
    raise exception 'Reservation product snapshot backfill is incomplete; no foreign-key change was made.';
  end if;
end;
$$;

-- Future product deletes also capture a snapshot in the same transaction. The
-- function is trigger-only: it is not executable by public or authenticated users.
create or replace function public.capture_reservation_product_snapshot_before_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.reservations
  set product_snapshot = jsonb_build_object(
    'captured_at', now(),
    'product', to_jsonb(old)
  )
  where product_id = old.id
    and product_snapshot is null;

  if exists (
    select 1
    from public.reservations
    where product_id = old.id
      and product_snapshot is null
  ) then
    raise exception 'Cannot delete product % because reservation audit snapshots are incomplete.', old.id;
  end if;

  return old;
end;
$$;

revoke all on function public.capture_reservation_product_snapshot_before_delete() from public, anon, authenticated;

drop trigger if exists reservations_capture_product_snapshot_before_delete on public.products;
create trigger reservations_capture_product_snapshot_before_delete
before delete on public.products
for each row execute function public.capture_reservation_product_snapshot_before_delete();

-- product_snapshot is audit evidence. It can be populated only when absent by
-- the delete trigger above; once captured, later edits cannot replace it.
create or replace function public.prevent_reservation_product_snapshot_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.product_snapshot is not null
     and new.product_snapshot is distinct from old.product_snapshot then
    raise exception 'Reservation product snapshots are immutable audit evidence.';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_reservation_product_snapshot_mutation() from public, anon, authenticated;

drop trigger if exists reservations_prevent_product_snapshot_mutation on public.reservations;
create trigger reservations_prevent_product_snapshot_mutation
before update on public.reservations
for each row execute function public.prevent_reservation_product_snapshot_mutation();

-- The original migration creates ON DELETE RESTRICT. Replace only that product
-- reference with SET NULL after the snapshot backfill above. No reservation row
-- or customer history is deleted.
alter table public.reservations
  alter column product_id drop not null;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select constraint_row.conname
    from pg_constraint as constraint_row
    join pg_attribute as attribute
      on attribute.attrelid = constraint_row.conrelid
     and attribute.attnum = any(constraint_row.conkey)
    where constraint_row.conrelid = 'public.reservations'::regclass
      and constraint_row.confrelid = 'public.products'::regclass
      and constraint_row.contype = 'f'
      and attribute.attname = 'product_id'
      and constraint_row.confdeltype <> 'n'
  loop
    execute format('alter table public.reservations drop constraint %I', constraint_name);
  end loop;

  if not exists (
    select 1
    from pg_constraint as constraint_row
    join pg_attribute as attribute
      on attribute.attrelid = constraint_row.conrelid
     and attribute.attnum = any(constraint_row.conkey)
    where constraint_row.conrelid = 'public.reservations'::regclass
      and constraint_row.confrelid = 'public.products'::regclass
      and constraint_row.contype = 'f'
      and attribute.attname = 'product_id'
      and constraint_row.confdeltype = 'n'
  ) then
    alter table public.reservations
      add constraint reservations_product_id_fkey
      foreign key (product_id)
      references public.products(id)
      on delete set null;
  end if;
end;
$$;

commit;

-- Read-only verification (run separately after commit):
-- select
--   (select count(*) from public.reservations where product_id is not null and product_snapshot is null) as missing_snapshots,
--   (select pg_get_constraintdef(c.oid) from pg_constraint c where c.conrelid = 'public.reservations'::regclass and c.contype = 'f' and c.confrelid = 'public.products'::regclass limit 1) as product_fk;
