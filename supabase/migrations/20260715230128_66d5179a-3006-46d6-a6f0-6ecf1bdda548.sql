
-- 1. Contact age fields
ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS milestone_alerts_fired jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. Household review scan
CREATE OR REPLACE FUNCTION public.run_household_review_scan(_lead_days int DEFAULT 30)
RETURNS TABLE(household_id uuid, action text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h record;
  dedup_key text;
  days_out int;
  title_text text;
BEGIN
  FOR h IN
    SELECT id, client_id, household_name, primary_advisor_user_id,
           next_review_due_at, last_review_completed_at
    FROM public.households
    WHERE next_review_due_at IS NOT NULL
      AND next_review_due_at <= now() + make_interval(days => _lead_days)
  LOOP
    -- Dedup key = household + this specific review cycle timestamp
    dedup_key := h.id::text || '|' || to_char(h.next_review_due_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS');

    IF EXISTS (
      SELECT 1 FROM public.notifications
      WHERE linked_type = 'household_review' AND linked_id = dedup_key
    ) THEN
      household_id := h.id; action := 'skipped_dedup'; RETURN NEXT;
      CONTINUE;
    END IF;

    days_out := EXTRACT(DAY FROM (h.next_review_due_at - now()))::int;
    IF h.next_review_due_at < now() THEN
      title_text := 'Household review overdue: ' || h.household_name;
    ELSE
      title_text := 'Household review due in ' || days_out || 'd: ' || h.household_name;
    END IF;

    INSERT INTO public.notifications (client_id, recipient_user_id, type, title, message, linked_type, linked_id)
    VALUES (h.client_id, h.primary_advisor_user_id, 'household_review', title_text,
            'Next review scheduled for ' || to_char(h.next_review_due_at,'YYYY-MM-DD'),
            'household_review', dedup_key);

    INSERT INTO public.crm_tasks (client_id, related_type, related_id, title, description,
                                  due_date, priority, assigned_user, task_category)
    VALUES (h.client_id, 'household', h.id, title_text,
            'Auto-generated household review reminder.',
            h.next_review_due_at,
            CASE WHEN h.next_review_due_at < now() THEN 'high' ELSE 'medium' END,
            h.primary_advisor_user_id, 'household_review');

    household_id := h.id; action := 'created'; RETURN NEXT;
  END LOOP;
END $$;

-- 3. Life-event milestone scan
CREATE OR REPLACE FUNCTION public.run_life_event_milestone_scan(_lookahead_days int DEFAULT 90)
RETURNS TABLE(contact_id uuid, milestone text, action text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
  ms record;
  milestone_date date;
  fired jsonb;
  title_text text;
BEGIN
  FOR c IN
    SELECT id, client_id, full_name, date_of_birth,
           COALESCE(milestone_alerts_fired, '[]'::jsonb) AS milestone_alerts_fired,
           contact_owner
    FROM public.crm_contacts
    WHERE date_of_birth IS NOT NULL
  LOOP
    fired := c.milestone_alerts_fired;

    FOR ms IN
      SELECT * FROM (VALUES
        ('59_5',        interval '59 years 6 months', 'Age 59½ — penalty-free retirement withdrawals'),
        ('62_ss_window',interval '62 years',          'Social Security claiming window opens (age 62)'),
        ('65_medicare', interval '65 years',          'Medicare enrollment window (age 65)'),
        ('73_rmd',      interval '73 years',          'RMD age reached (73, SECURE 2.0)')
      ) AS t(code, offset_iv, label)
    LOOP
      milestone_date := (c.date_of_birth + ms.offset_iv)::date;
      -- Within window: date is between today and today+lookahead
      IF milestone_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + _lookahead_days) THEN
        IF fired ? ms.code THEN
          contact_id := c.id; milestone := ms.code; action := 'skipped_dedup'; RETURN NEXT;
          CONTINUE;
        END IF;

        title_text := ms.label || ' — ' || c.full_name;

        INSERT INTO public.notifications (client_id, recipient_user_id, type, title, message, linked_type, linked_id)
        VALUES (c.client_id, c.contact_owner, 'contact_milestone', title_text,
                'Milestone date: ' || to_char(milestone_date,'YYYY-MM-DD'),
                'contact_milestone', c.id::text || '|' || ms.code);

        INSERT INTO public.crm_tasks (client_id, related_type, related_id, contact_id,
                                      title, description, due_date, priority, assigned_user, task_category)
        VALUES (c.client_id, 'contact', c.id, c.id, title_text,
                'Auto-generated life-event outreach.',
                milestone_date::timestamptz, 'medium', c.contact_owner, 'life_event');

        fired := fired || jsonb_build_array(ms.code);
        UPDATE public.crm_contacts SET milestone_alerts_fired = fired WHERE id = c.id;

        contact_id := c.id; milestone := ms.code; action := 'created'; RETURN NEXT;
      END IF;
    END LOOP;
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.run_household_review_scan(int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.run_life_event_milestone_scan(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_household_review_scan(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.run_life_event_milestone_scan(int) TO service_role;

-- 4. Schedule daily
DO $$
DECLARE j bigint;
BEGIN
  SELECT jobid INTO j FROM cron.job WHERE jobname = 'household-review-daily-scan';
  IF j IS NOT NULL THEN PERFORM cron.unschedule(j); END IF;
  SELECT jobid INTO j FROM cron.job WHERE jobname = 'life-event-milestone-daily-scan';
  IF j IS NOT NULL THEN PERFORM cron.unschedule(j); END IF;
END $$;

SELECT cron.schedule(
  'household-review-daily-scan',
  '15 13 * * *',
  $cron$ SELECT public.run_household_review_scan(30); $cron$
);

SELECT cron.schedule(
  'life-event-milestone-daily-scan',
  '20 13 * * *',
  $cron$ SELECT public.run_life_event_milestone_scan(90); $cron$
);
