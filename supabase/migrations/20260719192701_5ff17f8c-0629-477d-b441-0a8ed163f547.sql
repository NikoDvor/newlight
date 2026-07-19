
ALTER TABLE public.bdr_calendars
  ADD COLUMN IF NOT EXISTS closing_booking_slug text,
  ADD COLUMN IF NOT EXISTS closing_booking_title text DEFAULT 'Final Closing Meeting',
  ADD COLUMN IF NOT EXISTS closing_booking_description text,
  ADD COLUMN IF NOT EXISTS closing_booking_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS closing_booking_form_id uuid;

-- Backfill defaults for existing rows
UPDATE public.bdr_calendars
SET closing_booking_slug = booking_slug || '-closing'
WHERE booking_slug IS NOT NULL AND closing_booking_slug IS NULL;

-- Uniqueness for closing slug (allow multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS bdr_calendars_closing_booking_slug_key
  ON public.bdr_calendars (closing_booking_slug)
  WHERE closing_booking_slug IS NOT NULL;

-- Public RPC for the closing booking page (mirrors get_public_bdr_calendar).
CREATE OR REPLACE FUNCTION public.get_public_bdr_closing_calendar(_slug_or_id text)
RETURNS TABLE(
  id uuid,
  client_id uuid,
  name text,
  booking_slug text,
  closing_booking_slug text,
  availability jsonb,
  timezone text,
  closing_booking_title text,
  closing_booking_description text,
  closing_booking_active boolean,
  closing_booking_form_id uuid
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    c.id, c.client_id, c.name, c.booking_slug, c.closing_booking_slug,
    c.availability, c.timezone,
    c.closing_booking_title, c.closing_booking_description,
    c.closing_booking_active, c.closing_booking_form_id
  FROM public.bdr_calendars c
  WHERE c.closing_booking_active = true
    AND (
      c.closing_booking_slug = _slug_or_id
      OR (
        _slug_or_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND c.id = _slug_or_id::uuid
      )
    )
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_bdr_closing_calendar(text) TO anon, authenticated;
