-- SECURITY FIX: previously anonymous callers could SELECT * from bdr_calendars where
-- booking_active=true, enumerating every active client's calendar. Replace the broad
-- anon SELECT policy with a SECURITY DEFINER RPC that returns only the specific
-- calendar being booked (looked up by slug OR id).

DROP POLICY IF EXISTS "Anon can read active bdr_calendars" ON public.bdr_calendars;
REVOKE SELECT ON public.bdr_calendars FROM anon;

CREATE OR REPLACE FUNCTION public.get_public_bdr_calendar(_slug_or_id text)
RETURNS TABLE (
  id uuid,
  client_id uuid,
  name text,
  booking_slug text,
  availability jsonb,
  timezone text,
  booking_title text,
  booking_description text,
  booking_active boolean,
  booking_form_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id, c.client_id, c.name, c.booking_slug, c.availability, c.timezone,
    c.booking_title, c.booking_description, c.booking_active, c.booking_form_id
  FROM public.bdr_calendars c
  WHERE c.booking_active = true
    AND (
      c.booking_slug = _slug_or_id
      OR (
        _slug_or_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND c.id = _slug_or_id::uuid
      )
    )
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_bdr_calendar(text) TO anon, authenticated;