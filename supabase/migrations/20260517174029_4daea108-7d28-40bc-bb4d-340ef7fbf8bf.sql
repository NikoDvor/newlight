
ALTER TABLE public.bdr_calendar_events
  ADD COLUMN IF NOT EXISTS attendance text NOT NULL DEFAULT 'pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bdr_calendar_events_attendance_check'
  ) THEN
    ALTER TABLE public.bdr_calendar_events
      ADD CONSTRAINT bdr_calendar_events_attendance_check
      CHECK (attendance IN ('pending','attended','no_show','rescheduled'));
  END IF;
END $$;

-- Allow 'round_robin' as a source value
ALTER TABLE public.bdr_calendar_events DROP CONSTRAINT IF EXISTS bdr_calendar_events_source_check;
ALTER TABLE public.bdr_calendar_events
  ADD CONSTRAINT bdr_calendar_events_source_check
  CHECK (source = ANY (ARRAY['dialer','manual','booking_form','sdr_mirror','round_robin']));

ALTER TABLE public.nl_bdr_leads
  ADD COLUMN IF NOT EXISTS customer_notes text;
