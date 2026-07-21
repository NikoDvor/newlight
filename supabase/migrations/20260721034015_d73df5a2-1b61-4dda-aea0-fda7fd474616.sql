
ALTER TABLE public.bdr_calendar_events
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_3h_sent_at  timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_15m_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS bdr_calendar_events_reminder_scan_idx
  ON public.bdr_calendar_events (starts_at)
  WHERE reminder_15m_sent_at IS NULL;
