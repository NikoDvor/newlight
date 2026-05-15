
ALTER TABLE public.bdr_calendars
  ADD COLUMN IF NOT EXISTS booking_title text,
  ADD COLUMN IF NOT EXISTS booking_description text,
  ADD COLUMN IF NOT EXISTS booking_active boolean NOT NULL DEFAULT true;
