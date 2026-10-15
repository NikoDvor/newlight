CREATE OR REPLACE FUNCTION public.get_public_bdr_calendar(_slug_or_id text)
 RETURNS TABLE(id uuid, client_id uuid, name text, booking_slug text, availability jsonb, timezone text, booking_title text, booking_description text, booking_active boolean, booking_form_id uuid, min_notice_minutes integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT c.id, c.client_id, c.name, c.booking_slug, c.availability, c.timezone,
    c.booking_title, c.booking_description, c.booking_active, c.booking_form_id,
    c.min_notice_minutes
  FROM public.bdr_calendars c
  WHERE c.booking_active = true
    AND (c.booking_slug = _slug_or_id
      OR c.id = CASE WHEN _slug_or_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                     THEN _slug_or_id::uuid END)
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_bdr_booked_slots(_calendar_id uuid, _from timestamp with time zone, _to timestamp with time zone)
 RETURNS TABLE(_starts_at timestamp with time zone, _ends_at timestamp with time zone)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select e.starts_at as _starts_at, e.ends_at as _ends_at
  from public.bdr_calendar_events e
  join public.bdr_calendars c on c.id = e.calendar_id
  where e.calendar_id = _calendar_id
    and c.booking_active = true
    and e.starts_at >= _from
    and e.starts_at <= _to
    and coalesce(e.attendance, '') not in ('rescheduled','cancelled');
$function$;