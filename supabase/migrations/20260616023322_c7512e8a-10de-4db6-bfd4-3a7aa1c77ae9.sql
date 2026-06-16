-- BDR Calendars: enforce RLS
ALTER TABLE public.bdr_calendars ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.bdr_calendar_events ENABLE ROW LEVEL SECURITY;

-- Drop any existing public/anonymous access policies on these tables
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'bdr_calendars' AND schemaname = 'public'
  LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.bdr_calendars'; END LOOP;

  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'bdr_calendar_events' AND schemaname = 'public'
  LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.bdr_calendar_events'; END LOOP;
END $$;

-- bdr_calendars: admins see all, employees see only their own
CREATE POLICY "bdr_calendars_admin" ON public.bdr_calendars
  FOR ALL TO authenticated
  USING (private.is_admin_or_operator(auth.uid()))
  WITH CHECK (private.is_admin_or_operator(auth.uid()));

CREATE POLICY "bdr_calendars_own" ON public.bdr_calendars
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- bdr_calendar_events: admins see all, employees see only their own
CREATE POLICY "bdr_calendar_events_admin" ON public.bdr_calendar_events
  FOR ALL TO authenticated
  USING (private.is_admin_or_operator(auth.uid()))
  WITH CHECK (private.is_admin_or_operator(auth.uid()));

CREATE POLICY "bdr_calendar_events_own" ON public.bdr_calendar_events
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());