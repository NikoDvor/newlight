
-- BDR personal calendars
CREATE TABLE public.bdr_calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  name text NOT NULL,
  availability jsonb NOT NULL DEFAULT '{
    "mon":{"enabled":true,"start":"09:00","end":"17:00"},
    "tue":{"enabled":true,"start":"09:00","end":"17:00"},
    "wed":{"enabled":true,"start":"09:00","end":"17:00"},
    "thu":{"enabled":true,"start":"09:00","end":"17:00"},
    "fri":{"enabled":true,"start":"09:00","end":"17:00"},
    "sat":{"enabled":false,"start":"09:00","end":"17:00"},
    "sun":{"enabled":false,"start":"09:00","end":"17:00"}
  }'::jsonb,
  booking_slug text UNIQUE,
  timezone text NOT NULL DEFAULT 'America/Los_Angeles',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bdr_calendars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own calendar" ON public.bdr_calendars
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner can insert own calendar" ON public.bdr_calendars
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can update own calendar" ON public.bdr_calendars
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Public can view bookable calendars by slug" ON public.bdr_calendars
  FOR SELECT TO anon, authenticated USING (booking_slug IS NOT NULL);

CREATE TRIGGER bdr_calendars_updated_at BEFORE UPDATE ON public.bdr_calendars
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- BDR calendar events
CREATE TABLE public.bdr_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  calendar_id uuid NOT NULL REFERENCES public.bdr_calendars(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  all_day boolean NOT NULL DEFAULT false,
  -- forward-compat tracking fields (used now and by future SDR mirror)
  lead_id uuid,
  contact_id uuid,
  outcome text,
  stage text,
  source text NOT NULL DEFAULT 'manual',
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bdr_calendar_events_source_check
    CHECK (source IN ('dialer','manual','booking_form','sdr_mirror'))
);

CREATE INDEX idx_bdr_events_user_starts ON public.bdr_calendar_events(user_id, starts_at);
CREATE INDEX idx_bdr_events_calendar_starts ON public.bdr_calendar_events(calendar_id, starts_at);
CREATE INDEX idx_bdr_events_lead ON public.bdr_calendar_events(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX idx_bdr_events_source ON public.bdr_calendar_events(source);

ALTER TABLE public.bdr_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own events" ON public.bdr_calendar_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner can insert own events" ON public.bdr_calendar_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can update own events" ON public.bdr_calendar_events
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner can delete own events" ON public.bdr_calendar_events
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER bdr_calendar_events_updated_at BEFORE UPDATE ON public.bdr_calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
