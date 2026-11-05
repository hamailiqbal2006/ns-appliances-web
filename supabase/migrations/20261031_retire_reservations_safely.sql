-- ==============================================================================
-- NS HOME APPLIANCES — SAFE RETIREMENT OF PRODUCT RESERVATION SYSTEM
-- Version: 20261031_01
-- Description:
-- Safely retires the product reservation system while strictly preserving all
-- historical records for audit and compliance. Revokes all public execution rights,
-- disables reservation creation endpoints, drops unused reservation RPCs, and
-- locks down RLS so no new reservations can be created or queried by public visitors.
--
-- Customer leads, newsletter subscriptions, inquiries, and catalog products remain
-- completely intact and unaffected.
--
-- Safe to execute in the Supabase SQL Editor.
-- ==============================================================================

-- 1. REVOKE ALL PUBLIC ACCESS TO RESERVATIONS TABLE
-- Ensure table remains strictly private and protected by Row Level Security
ALTER TABLE IF EXISTS public.reservations ENABLE ROW LEVEL SECURITY;

-- Revoke all table-level operations from public and anonymous visitors
REVOKE ALL ON TABLE public.reservations FROM anon, public;

-- Drop existing reservation policies
DROP POLICY IF EXISTS "Public reads reservations" ON public.reservations;
DROP POLICY IF EXISTS "Admins manage reservations" ON public.reservations;
DROP POLICY IF EXISTS "Archived reservations admin read only" ON public.reservations;

-- Preserve historical records: Allow only verified administrators to read archived records
-- No INSERT, UPDATE, or DELETE policy is granted, preventing new reservation creations.
CREATE POLICY "Archived reservations admin read only" ON public.reservations
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Ensure authenticated role only has SELECT privilege for admin historical review
REVOKE INSERT, UPDATE, DELETE ON TABLE public.reservations FROM authenticated;
GRANT SELECT ON TABLE public.reservations TO authenticated;


-- 2. DROP OBSOLETE PUBLIC RESERVATION RPCs
-- Completely prevents new reservation requests from being submitted through public RPC endpoints
DROP FUNCTION IF EXISTS public.submit_reservation_request(uuid, text, text, text, text);
DROP FUNCTION IF EXISTS public.submit_store_reservation(uuid, text, text);
DROP FUNCTION IF EXISTS public.submit_recognized_store_reservation(uuid, text);
DROP FUNCTION IF EXISTS public.get_public_reservation_pass(text);


-- 3. DROP OBSOLETE ADMIN RESERVATION MANAGEMENT RPCs
-- Admin reservation management functions are decommissioned
DROP FUNCTION IF EXISTS public.admin_approve_reservation(uuid, text);
DROP FUNCTION IF EXISTS public.admin_deny_reservation(uuid, text);
DROP FUNCTION IF EXISTS public.admin_mark_reservation_whatsapp_sent(uuid);
DROP FUNCTION IF EXISTS public.admin_complete_reservation(uuid);


-- 4. CLEAN UP UNUSED PASS TOKEN INDEXES (SAFE & NON-DESTRUCTIVE)
-- Historical reservation records and columns remain preserved in public.reservations
DROP INDEX IF EXISTS public.idx_reservations_pass_token;


-- 5. AUDIT COMMENTS
COMMENT ON TABLE public.reservations IS
  'HISTORICAL ARCHIVE: Product reservation system decommissioned on 2026-10-31. Table preserved for historical audit only. Public write and execute access revoked.';
