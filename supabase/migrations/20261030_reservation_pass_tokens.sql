-- ==============================================================================
-- NS HOME APPLIANCES — DIGITAL RESERVATION PASS TOKEN MIGRATION
-- Adds pass_token column and secure public pass RPC for verifiable booking tokens
-- ==============================================================================

-- 1. Ensure pass_token column exists on public.reservations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reservations'
      AND column_name = 'pass_token'
  ) THEN
    ALTER TABLE public.reservations ADD COLUMN pass_token text UNIQUE;
  END IF;
END $$;

-- 2. Indexes for fast token & reference lookups
CREATE INDEX IF NOT EXISTS idx_reservations_pass_token ON public.reservations (pass_token);
CREATE INDEX IF NOT EXISTS idx_reservations_ref ON public.reservations (reservation_ref);

-- 3. Security Definer RPC for Safe Public Reservation Pass Resolution
-- Note: This function deliberately excludes customer contact details (phone, email)
-- and internal admin notes from the returned payload for complete privacy.
CREATE OR REPLACE FUNCTION public.get_public_reservation_pass(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res record;
  v_prod record;
BEGIN
  IF p_token IS NULL OR trim(p_token) = '' THEN
    RETURN NULL;
  END IF;

  -- Attempt match by pass_token, reservation_ref, or uuid id
  SELECT * INTO v_res
  FROM public.reservations
  WHERE pass_token = p_token
     OR reservation_ref = p_token
     OR (p_token ~ '^[0-9a-fA-F-]{36}$' AND id::text = p_token)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Lookup associated product
  SELECT image, price_pkr, category, slug INTO v_prod
  FROM public.products
  WHERE id = v_res.product_id
  LIMIT 1;

  RETURN jsonb_build_object(
    'id', v_res.id,
    'reservation_ref', COALESCE(v_res.reservation_ref, 'NS-RES-' || UPPER(SUBSTRING(v_res.id::text, 1, 6))),
    'status', v_res.status,
    'product_name', v_res.product_name,
    'product_slug', v_prod.slug,
    'product_image', v_prod.image,
    'product_category', v_prod.category,
    'product_price_pkr', v_prod.price_pkr,
    'quantity', COALESCE(v_res.quantity, 1),
    'decision_at', v_res.decision_at,
    'holding_deadline', v_res.holding_deadline,
    'created_at', v_res.created_at
  );
END;
$$;

-- 4. Grant access to public/anon callers
GRANT EXECUTE ON FUNCTION public.get_public_reservation_pass(text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_public_reservation_pass(text) IS
  'Secure public pass lookup returning only non-sensitive appliance booking details for digital boarding passes.';
