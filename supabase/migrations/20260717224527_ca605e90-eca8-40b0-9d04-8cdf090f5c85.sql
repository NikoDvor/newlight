ALTER TABLE public.nl_bdr_leads
  ADD COLUMN IF NOT EXISTS booking_platform text,
  ADD COLUMN IF NOT EXISTS self_booking_widget_non_owner boolean,
  ADD COLUMN IF NOT EXISTS meeting_booked text;