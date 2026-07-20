
CREATE OR REPLACE FUNCTION public.get_public_bdr_payment_calendar(_slug_or_id text)
 RETURNS TABLE(id uuid, client_id uuid, name text, booking_slug text, payment_booking_slug text, availability jsonb, timezone text, payment_booking_title text, payment_booking_description text, payment_booking_active boolean, payment_booking_form_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    c.id, c.client_id, c.name, c.booking_slug, c.payment_booking_slug,
    c.availability, c.timezone,
    c.payment_booking_title, c.payment_booking_description,
    c.payment_booking_active, c.payment_booking_form_id
  FROM public.bdr_calendars c
  WHERE c.payment_booking_active = true
    AND (
      c.payment_booking_slug = _slug_or_id
      OR (
        _slug_or_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND c.id = _slug_or_id::uuid
      )
    )
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_bdr_payment_calendar(text) TO anon, authenticated;
