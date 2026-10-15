ALTER TABLE public.bdr_calendar_events ADD COLUMN IF NOT EXISTS meeting_sequence integer;
ALTER TABLE public.bdr_meeting_outcomes ADD COLUMN IF NOT EXISTS meeting_sequence integer;

ALTER TABLE public.bdr_calendar_events DROP CONSTRAINT bdr_calendar_events_attendance_check;
ALTER TABLE public.bdr_calendar_events ADD CONSTRAINT bdr_calendar_events_attendance_check
  CHECK (attendance IN ('pending','attended','no_show','rescheduled','cancelled'));
ALTER TABLE public.bdr_meeting_outcomes DROP CONSTRAINT bdr_meeting_outcomes_attendance_check;
ALTER TABLE public.bdr_meeting_outcomes ADD CONSTRAINT bdr_meeting_outcomes_attendance_check
  CHECK (attendance IN ('attended','no_show','cancelled'));

CREATE OR REPLACE FUNCTION public.bdr_events_set_kind_attempt()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.meeting_kind IS NULL THEN
    NEW.meeting_kind := public.bdr_event_meeting_kind_from_source(NEW.source);
  END IF;
  IF NEW.meeting_kind IS NOT NULL AND NEW.lead_id IS NOT NULL AND NEW.attempt_number IS NULL THEN
    SELECT 1 + count(*) INTO NEW.attempt_number
    FROM public.bdr_calendar_events
    WHERE lead_id = NEW.lead_id AND meeting_kind = NEW.meeting_kind;
  END IF;
  IF NEW.lead_id IS NOT NULL AND NEW.meeting_kind IN ('discovery','closing','onboarding') THEN
    SELECT 1 + count(*) INTO NEW.meeting_sequence
    FROM public.bdr_calendar_events
    WHERE lead_id = NEW.lead_id AND meeting_kind IN ('discovery','closing','onboarding');
  END IF;
  RETURN NEW;
END $function$;

UPDATE public.bdr_calendar_events e SET meeting_sequence = s.rn
FROM (
  SELECT id, row_number() OVER (PARTITION BY lead_id ORDER BY created_at, id) AS rn
  FROM public.bdr_calendar_events
  WHERE lead_id IS NOT NULL AND meeting_kind IN ('discovery','closing','onboarding')
) s WHERE e.id = s.id;

CREATE OR REPLACE FUNCTION public.bdr_outcomes_set_sequence()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.meeting_sequence IS NULL THEN
    SELECT meeting_sequence INTO NEW.meeting_sequence FROM public.bdr_calendar_events WHERE id = NEW.event_id;
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS bdr_outcomes_set_sequence ON public.bdr_meeting_outcomes;
CREATE TRIGGER bdr_outcomes_set_sequence BEFORE INSERT ON public.bdr_meeting_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.bdr_outcomes_set_sequence();

UPDATE public.bdr_meeting_outcomes o SET meeting_sequence = e.meeting_sequence
FROM public.bdr_calendar_events e WHERE e.id = o.event_id AND o.meeting_sequence IS NULL;