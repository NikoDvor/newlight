
ALTER TABLE public.bdr_calendars ADD COLUMN IF NOT EXISTS min_notice_minutes integer NOT NULL DEFAULT 60;
ALTER TABLE public.calendars ADD COLUMN IF NOT EXISTS min_notice_minutes integer NOT NULL DEFAULT 60;

DROP FUNCTION IF EXISTS public.get_public_bdr_calendar(text);
CREATE FUNCTION public.get_public_bdr_calendar(_slug_or_id text)
 RETURNS TABLE(id uuid, client_id uuid, name text, booking_slug text, availability jsonb, timezone text, booking_title text, booking_description text, booking_active boolean, booking_form_id uuid, min_notice_minutes integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT c.id, c.client_id, c.name, c.booking_slug, c.availability, c.timezone,
    c.booking_title, c.booking_description, c.booking_active, c.booking_form_id,
    c.min_notice_minutes
  FROM public.bdr_calendars c
  WHERE c.booking_active = true
    AND (c.booking_slug = _slug_or_id
      OR (_slug_or_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          AND c.id = _slug_or_id::uuid))
  LIMIT 1;
$$;

DROP FUNCTION IF EXISTS public.get_public_bdr_closing_calendar(text);
CREATE FUNCTION public.get_public_bdr_closing_calendar(_slug_or_id text)
 RETURNS TABLE(id uuid, client_id uuid, name text, booking_slug text, closing_booking_slug text, availability jsonb, timezone text, closing_booking_title text, closing_booking_description text, closing_booking_active boolean, closing_booking_form_id uuid, min_notice_minutes integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT c.id, c.client_id, c.name, c.booking_slug, c.closing_booking_slug,
    c.availability, c.timezone, c.closing_booking_title, c.closing_booking_description,
    c.closing_booking_active, c.closing_booking_form_id, c.min_notice_minutes
  FROM public.bdr_calendars c
  WHERE c.closing_booking_active = true
    AND (c.closing_booking_slug = _slug_or_id
      OR (_slug_or_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          AND c.id = _slug_or_id::uuid))
  LIMIT 1;
$$;

DROP FUNCTION IF EXISTS public.get_public_bdr_payment_calendar(text);
CREATE FUNCTION public.get_public_bdr_payment_calendar(_slug_or_id text)
 RETURNS TABLE(id uuid, client_id uuid, name text, booking_slug text, payment_booking_slug text, availability jsonb, timezone text, payment_booking_title text, payment_booking_description text, payment_booking_active boolean, payment_booking_form_id uuid, min_notice_minutes integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT c.id, c.client_id, c.name, c.booking_slug, c.payment_booking_slug,
    c.availability, c.timezone, c.payment_booking_title, c.payment_booking_description,
    c.payment_booking_active, c.payment_booking_form_id, c.min_notice_minutes
  FROM public.bdr_calendars c
  WHERE c.payment_booking_active = true
    AND (c.payment_booking_slug = _slug_or_id
      OR (_slug_or_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          AND c.id = _slug_or_id::uuid))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.enforce_appointment_min_notice()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE min_min integer;
BEGIN
  IF NEW.booking_source IS NULL OR NEW.booking_source = 'manual' THEN
    RETURN NEW;
  END IF;
  SELECT min_notice_minutes INTO min_min FROM public.calendars WHERE id = NEW.calendar_id;
  IF min_min IS NOT NULL AND NEW.start_time < now() + make_interval(mins => min_min) THEN
    RAISE EXCEPTION 'Booking must be at least % minutes from now', min_min USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_enforce_appointment_min_notice ON public.appointments;
CREATE TRIGGER trg_enforce_appointment_min_notice
BEFORE INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.enforce_appointment_min_notice();

CREATE OR REPLACE FUNCTION public.enforce_bdr_event_min_notice()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE min_min integer;
BEGIN
  IF NEW.source NOT IN ('public_booking','closing_booking','payment_booking') THEN
    RETURN NEW;
  END IF;
  SELECT min_notice_minutes INTO min_min FROM public.bdr_calendars WHERE id = NEW.calendar_id;
  IF min_min IS NOT NULL AND NEW.starts_at < now() + make_interval(mins => min_min) THEN
    RAISE EXCEPTION 'Booking must be at least % minutes from now', min_min USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_enforce_bdr_event_min_notice ON public.bdr_calendar_events;
CREATE TRIGGER trg_enforce_bdr_event_min_notice
BEFORE INSERT ON public.bdr_calendar_events FOR EACH ROW EXECUTE FUNCTION public.enforce_bdr_event_min_notice();
