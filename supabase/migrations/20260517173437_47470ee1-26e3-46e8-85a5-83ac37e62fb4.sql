
ALTER TABLE public.bdr_calendars
  ADD COLUMN IF NOT EXISTS round_robin_pool boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS google_sync_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS outlook_sync_enabled boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_bdr_calendars_rr_pool
  ON public.bdr_calendars (round_robin_pool, last_assigned_at NULLS FIRST)
  WHERE round_robin_pool = true AND booking_active = true;

ALTER TABLE public.nl_bdr_leads
  ADD COLUMN IF NOT EXISTS email text;

DROP POLICY IF EXISTS "Admins can view all bdr calendars" ON public.bdr_calendars;
CREATE POLICY "Admins can view all bdr calendars"
  ON public.bdr_calendars FOR SELECT TO authenticated
  USING (private.is_admin_or_operator(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all bdr calendars" ON public.bdr_calendars;
CREATE POLICY "Admins can update all bdr calendars"
  ON public.bdr_calendars FOR UPDATE TO authenticated
  USING (private.is_admin_or_operator(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all bdr calendar events" ON public.bdr_calendar_events;
CREATE POLICY "Admins can view all bdr calendar events"
  ON public.bdr_calendar_events FOR SELECT TO authenticated
  USING (private.is_admin_or_operator(auth.uid()));
