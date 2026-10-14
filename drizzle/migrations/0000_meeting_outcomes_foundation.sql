ALTER TABLE public.bdr_calendar_events
  ADD COLUMN IF NOT EXISTS meeting_kind text NULL,
  ADD COLUMN IF NOT EXISTS attempt_number integer NULL;
ALTER TABLE public.bdr_calendar_events
  ADD CONSTRAINT bdr_calendar_events_meeting_kind_check
  CHECK (meeting_kind IN ('discovery','closing','onboarding','service'));

CREATE OR REPLACE FUNCTION public.bdr_event_meeting_kind_from_source(_source text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _source IN ('booking_form','round_robin') THEN 'discovery'
    WHEN _source = 'closing_meeting' THEN 'closing'
    WHEN _source = 'onboarding_meeting' THEN 'onboarding'
    WHEN _source IN ('service_meeting','admin_weekly_recurring') THEN 'service'
    ELSE NULL END
$$;

CREATE OR REPLACE FUNCTION public.bdr_events_set_kind_attempt()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.meeting_kind IS NULL THEN
    NEW.meeting_kind := public.bdr_event_meeting_kind_from_source(NEW.source);
  END IF;
  IF NEW.meeting_kind IS NOT NULL AND NEW.lead_id IS NOT NULL AND NEW.attempt_number IS NULL THEN
    SELECT 1 + count(*) INTO NEW.attempt_number
    FROM public.bdr_calendar_events
    WHERE lead_id = NEW.lead_id AND meeting_kind = NEW.meeting_kind;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER bdr_events_set_kind_attempt
BEFORE INSERT ON public.bdr_calendar_events
FOR EACH ROW EXECUTE FUNCTION public.bdr_events_set_kind_attempt();

UPDATE public.bdr_calendar_events
SET meeting_kind = public.bdr_event_meeting_kind_from_source(source)
WHERE meeting_kind IS NULL AND public.bdr_event_meeting_kind_from_source(source) IS NOT NULL;

UPDATE public.bdr_calendar_events e
SET attempt_number = r.rn
FROM (
  SELECT id, row_number() OVER (PARTITION BY lead_id, meeting_kind ORDER BY starts_at, created_at, id) AS rn
  FROM public.bdr_calendar_events
  WHERE meeting_kind IS NOT NULL AND lead_id IS NOT NULL
) r
WHERE e.id = r.id AND e.attempt_number IS NULL;

CREATE TABLE public.bdr_meeting_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.bdr_calendar_events(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.nl_bdr_leads(id) ON DELETE CASCADE,
  rep_user_id uuid NOT NULL,
  meeting_kind text NOT NULL CHECK (meeting_kind IN ('discovery','closing','onboarding','pay_sign')),
  attempt_number integer NOT NULL DEFAULT 1,
  attendance text CHECK (attendance IN ('attended','no_show')),
  result text NOT NULL CHECK (result IN ('won','rescheduled','lost')),
  next_step text,
  next_event_id uuid REFERENCES public.bdr_calendar_events(id) ON DELETE SET NULL,
  reschedule_reason text,
  primary_lost_reason text,
  lost_reasons text[] NOT NULL DEFAULT '{}',
  notes text,
  logged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bdr_meeting_outcomes_event_kind_key UNIQUE (event_id, meeting_kind)
);
CREATE INDEX idx_bdr_meeting_outcomes_rep ON public.bdr_meeting_outcomes(rep_user_id);
CREATE INDEX idx_bdr_meeting_outcomes_lead ON public.bdr_meeting_outcomes(lead_id);
CREATE INDEX idx_bdr_meeting_outcomes_kind ON public.bdr_meeting_outcomes(meeting_kind);
CREATE INDEX idx_bdr_meeting_outcomes_result ON public.bdr_meeting_outcomes(result);
CREATE INDEX idx_bdr_meeting_outcomes_logged ON public.bdr_meeting_outcomes(logged_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bdr_meeting_outcomes TO authenticated;
GRANT ALL ON public.bdr_meeting_outcomes TO service_role;
ALTER TABLE public.bdr_meeting_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY bdr_meeting_outcomes_own ON public.bdr_meeting_outcomes FOR ALL TO authenticated
  USING (rep_user_id = auth.uid()) WITH CHECK (rep_user_id = auth.uid());
CREATE POLICY bdr_meeting_outcomes_admin ON public.bdr_meeting_outcomes FOR ALL TO authenticated
  USING (private.is_admin_or_operator(auth.uid())) WITH CHECK (private.is_admin_or_operator(auth.uid()));