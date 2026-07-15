
-- 1. webinar_events
CREATE TYPE public.webinar_event_status AS ENUM ('draft','scheduled','completed','cancelled');

CREATE TABLE public.webinar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  topic text,
  host_name text,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  join_url text,
  registration_slug text NOT NULL UNIQUE,
  status public.webinar_event_status NOT NULL DEFAULT 'draft',
  recurrence_rrule text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_webinar_events_client ON public.webinar_events(client_id);
CREATE INDEX idx_webinar_events_slug ON public.webinar_events(registration_slug);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.webinar_events TO authenticated;
GRANT SELECT ON public.webinar_events TO anon;
GRANT ALL ON public.webinar_events TO service_role;

ALTER TABLE public.webinar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view schedulable webinars"
  ON public.webinar_events FOR SELECT
  TO anon, authenticated
  USING (status IN ('draft','scheduled','completed'));

CREATE POLICY "Admins and operators manage webinars"
  ON public.webinar_events FOR ALL
  TO authenticated
  USING (private.is_admin_or_operator(auth.uid()))
  WITH CHECK (private.is_admin_or_operator(auth.uid()));

CREATE TRIGGER trg_webinar_events_updated_at
  BEFORE UPDATE ON public.webinar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. webinar_registrations
CREATE TABLE public.webinar_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_event_id uuid NOT NULL REFERENCES public.webinar_events(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  registered_at timestamptz NOT NULL DEFAULT now(),
  attended boolean NOT NULL DEFAULT false,
  reminder_24h_sent_at timestamptz,
  reminder_1h_sent_at timestamptz,
  followup_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (webinar_event_id, email)
);
CREATE INDEX idx_webinar_reg_event ON public.webinar_registrations(webinar_event_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.webinar_registrations TO authenticated;
GRANT INSERT ON public.webinar_registrations TO anon;
GRANT ALL ON public.webinar_registrations TO service_role;

ALTER TABLE public.webinar_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can register for a schedulable webinar"
  ON public.webinar_registrations FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.webinar_events e
      WHERE e.id = webinar_event_id
        AND e.status IN ('draft','scheduled')
    )
  );

CREATE POLICY "Admins and operators manage registrations"
  ON public.webinar_registrations FOR ALL
  TO authenticated
  USING (private.is_admin_or_operator(auth.uid()))
  WITH CHECK (private.is_admin_or_operator(auth.uid()));

-- 3. Reminder scan (24h + 1h)
CREATE OR REPLACE FUNCTION public.run_webinar_reminder_scan()
RETURNS TABLE(registration_id uuid, kind text, action text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  -- 24-hour reminders: event is between now+23h and now+25h and not yet sent
  FOR r IN
    SELECT reg.id, reg.email, reg.full_name, e.client_id, e.id AS event_id,
           e.title, e.scheduled_at
    FROM public.webinar_registrations reg
    JOIN public.webinar_events e ON e.id = reg.webinar_event_id
    WHERE reg.reminder_24h_sent_at IS NULL
      AND e.status = 'scheduled'
      AND e.scheduled_at BETWEEN now() + interval '23 hours' AND now() + interval '25 hours'
  LOOP
    UPDATE public.webinar_registrations SET reminder_24h_sent_at = now() WHERE id = r.id;

    INSERT INTO public.notification_send_log
      (client_id, action_type, channel, recipient_email, subject, body_preview, send_status, metadata)
    VALUES (r.client_id, 'webinar_reminder_24h', 'email', r.email,
            'Reminder: "' || r.title || '" is tomorrow',
            'Hi ' || r.full_name || ', this is a reminder that "' || r.title
              || '" starts at ' || to_char(r.scheduled_at, 'YYYY-MM-DD HH24:MI TZ') || '.',
            'queued',
            jsonb_build_object('webinar_event_id', r.event_id, 'registration_id', r.id, 'kind','24h'));

    INSERT INTO public.automation_events (client_id, event_type, event_key, event_name,
                                          related_type, related_id, event_data)
    VALUES (r.client_id, 'webinar_reminder_sent', 'webinar_reminder_sent', 'Webinar Reminder Sent',
            'webinar_registration', r.id,
            jsonb_build_object('kind','24h','webinar_event_id', r.event_id, 'email', r.email));

    registration_id := r.id; kind := '24h'; action := 'sent'; RETURN NEXT;
  END LOOP;

  -- 1-hour reminders
  FOR r IN
    SELECT reg.id, reg.email, reg.full_name, e.client_id, e.id AS event_id,
           e.title, e.scheduled_at
    FROM public.webinar_registrations reg
    JOIN public.webinar_events e ON e.id = reg.webinar_event_id
    WHERE reg.reminder_1h_sent_at IS NULL
      AND e.status = 'scheduled'
      AND e.scheduled_at BETWEEN now() + interval '30 minutes' AND now() + interval '90 minutes'
  LOOP
    UPDATE public.webinar_registrations SET reminder_1h_sent_at = now() WHERE id = r.id;

    INSERT INTO public.notification_send_log
      (client_id, action_type, channel, recipient_email, subject, body_preview, send_status, metadata)
    VALUES (r.client_id, 'webinar_reminder_1h', 'email', r.email,
            'Starting soon: "' || r.title || '"',
            'Hi ' || r.full_name || ', "' || r.title || '" begins in about an hour.',
            'queued',
            jsonb_build_object('webinar_event_id', r.event_id, 'registration_id', r.id, 'kind','1h'));

    INSERT INTO public.automation_events (client_id, event_type, event_key, event_name,
                                          related_type, related_id, event_data)
    VALUES (r.client_id, 'webinar_reminder_sent', 'webinar_reminder_sent', 'Webinar Reminder Sent',
            'webinar_registration', r.id,
            jsonb_build_object('kind','1h','webinar_event_id', r.event_id, 'email', r.email));

    registration_id := r.id; kind := '1h'; action := 'sent'; RETURN NEXT;
  END LOOP;
END $$;

-- 4. Follow-up scan (post-event, differentiated by attended)
CREATE OR REPLACE FUNCTION public.run_webinar_followup_scan()
RETURNS TABLE(registration_id uuid, attended boolean, action text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  ends_at timestamptz;
  subj text;
  body text;
BEGIN
  FOR r IN
    SELECT reg.id, reg.email, reg.full_name, reg.attended,
           e.client_id, e.id AS event_id, e.title, e.scheduled_at, e.duration_minutes
    FROM public.webinar_registrations reg
    JOIN public.webinar_events e ON e.id = reg.webinar_event_id
    WHERE reg.followup_sent_at IS NULL
      AND (e.scheduled_at + make_interval(mins => e.duration_minutes)) <= now()
      AND (e.scheduled_at + make_interval(mins => e.duration_minutes)) >= now() - interval '24 hours'
      AND e.status IN ('scheduled','completed')
  LOOP
    ends_at := r.scheduled_at + make_interval(mins => r.duration_minutes);

    IF r.attended THEN
      subj := 'Thanks for attending "' || r.title || '"';
      body := 'Hi ' || r.full_name || ', thanks for joining "' || r.title
            || '". Here are the follow-up materials and next steps.';
    ELSE
      subj := 'Sorry we missed you — "' || r.title || '" recording inside';
      body := 'Hi ' || r.full_name || ', we missed you at "' || r.title
            || '". Here is the recording and a summary.';
    END IF;

    UPDATE public.webinar_registrations SET followup_sent_at = now() WHERE id = r.id;

    INSERT INTO public.notification_send_log
      (client_id, action_type, channel, recipient_email, subject, body_preview, send_status, metadata)
    VALUES (r.client_id, 'webinar_followup', 'email', r.email, subj, body, 'queued',
            jsonb_build_object('webinar_event_id', r.event_id, 'registration_id', r.id,
                               'attended', r.attended));

    INSERT INTO public.automation_events (client_id, event_type, event_key, event_name,
                                          related_type, related_id, event_data)
    VALUES (r.client_id, 'webinar_followup_sent', 'webinar_followup_sent', 'Webinar Follow-up Sent',
            'webinar_registration', r.id,
            jsonb_build_object('attended', r.attended, 'webinar_event_id', r.event_id,
                               'email', r.email));

    registration_id := r.id; attended := r.attended; action := 'sent'; RETURN NEXT;
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.run_webinar_reminder_scan() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.run_webinar_followup_scan() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_webinar_reminder_scan() TO service_role;
GRANT EXECUTE ON FUNCTION public.run_webinar_followup_scan() TO service_role;

-- 5. Schedule hourly
DO $$
DECLARE j bigint;
BEGIN
  SELECT jobid INTO j FROM cron.job WHERE jobname = 'webinar-reminder-hourly-scan';
  IF j IS NOT NULL THEN PERFORM cron.unschedule(j); END IF;
  SELECT jobid INTO j FROM cron.job WHERE jobname = 'webinar-followup-hourly-scan';
  IF j IS NOT NULL THEN PERFORM cron.unschedule(j); END IF;
END $$;

SELECT cron.schedule('webinar-reminder-hourly-scan', '5 * * * *',
  $cron$ SELECT public.run_webinar_reminder_scan(); $cron$);
SELECT cron.schedule('webinar-followup-hourly-scan', '10 * * * *',
  $cron$ SELECT public.run_webinar_followup_scan(); $cron$);
