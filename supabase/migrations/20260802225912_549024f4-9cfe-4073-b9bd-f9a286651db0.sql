ALTER TABLE public.nl_bdr_leads
  ADD COLUMN IF NOT EXISTS booking_system_methods text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS booking_system_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS booking_system_platform text;

CREATE INDEX IF NOT EXISTS idx_nl_bdr_leads_booking_system
  ON public.nl_bdr_leads (has_booking_system);