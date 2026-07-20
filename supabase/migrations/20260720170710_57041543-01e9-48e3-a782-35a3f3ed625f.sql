
CREATE OR REPLACE FUNCTION public.enforce_bdr_event_min_notice()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE min_min integer;
BEGIN
  IF NEW.source NOT IN ('booking_form','round_robin','closing_booking','payment_booking','public_booking') THEN
    RETURN NEW;
  END IF;
  SELECT min_notice_minutes INTO min_min FROM public.bdr_calendars WHERE id = NEW.calendar_id;
  IF min_min IS NOT NULL AND NEW.starts_at < now() + make_interval(mins => min_min) THEN
    RAISE EXCEPTION 'Booking must be at least % minutes from now', min_min USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END $$;
