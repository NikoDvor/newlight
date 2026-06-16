ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS daily_room_url text,
  ADD COLUMN IF NOT EXISTS daily_room_name text,
  ADD COLUMN IF NOT EXISTS meeting_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS meeting_ended_at timestamptz;

ALTER TABLE public.sales_meetings
  ADD COLUMN IF NOT EXISTS daily_room_url text,
  ADD COLUMN IF NOT EXISTS daily_room_name text,
  ADD COLUMN IF NOT EXISTS meeting_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS meeting_ended_at timestamptz;