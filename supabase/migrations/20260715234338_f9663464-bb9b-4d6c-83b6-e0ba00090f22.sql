
CREATE OR REPLACE FUNCTION public.run_setup_item_auto_reminder_scan(
  _stale_days int DEFAULT 5,
  _max_reminders int DEFAULT 3
)
RETURNS TABLE(item_id uuid, action text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  it record;
  stale_cutoff timestamptz := now() - make_interval(days => _stale_days);
  last_activity timestamptz;
  title_text text;
BEGIN
  FOR it IN
    SELECT s.id, s.client_id, s.item_key, s.item_label, s.item_status,
           s.reminder_count, s.last_reminded_at, s.requested_at, s.assigned_to,
           c.name AS client_name
    FROM public.client_setup_items s
    LEFT JOIN public.clients c ON c.id = s.client_id
    WHERE s.item_status IN ('requested', 'reminded')
      AND COALESCE(s.last_reminded_at, s.requested_at) IS NOT NULL
      AND COALESCE(s.last_reminded_at, s.requested_at) < stale_cutoff
  LOOP
    -- Escalation branch
    IF it.reminder_count >= _max_reminders THEN
      -- Dedup: one escalation per item until resolved
      IF EXISTS (
        SELECT 1 FROM public.notifications
        WHERE linked_type = 'setup_item_escalation' AND linked_id = it.id::text
      ) THEN
        item_id := it.id; action := 'skipped_escalation_dedup'; RETURN NEXT;
        CONTINUE;
      END IF;

      title_text := 'Setup item needs admin attention: ' || it.item_label;

      INSERT INTO public.notifications (client_id, recipient_user_id, type, title, message, linked_type, linked_id)
      VALUES (it.client_id, it.assigned_to, 'setup_item_escalation', title_text,
              'Client has not responded after ' || _max_reminders || ' auto-reminders for "' || it.item_label || '". Manual outreach recommended.',
              'setup_item_escalation', it.id::text);

      INSERT INTO public.crm_tasks (client_id, related_type, related_id, title, description,
                                    due_date, priority, assigned_user, task_category)
      VALUES (it.client_id, 'setup_item', it.id, title_text,
              'Auto-generated: client unresponsive after ' || _max_reminders || ' reminders.',
              now(), 'high', it.assigned_to, 'setup_escalation');

      INSERT INTO public.audit_logs (client_id, action, module, metadata)
      VALUES (it.client_id, 'setup_item_reminder_escalated', 'setup_request',
              jsonb_build_object('item_id', it.id, 'item_key', it.item_key,
                                 'item_label', it.item_label, 'reminder_count', it.reminder_count));

      INSERT INTO public.automation_events (client_id, event_type, event_key, event_name,
                                            related_type, related_id, event_data)
      VALUES (it.client_id, 'setup_item_reminder_escalated', 'setup_item_reminder_escalated',
              'Setup Item Reminder Escalated', 'setup_item', it.id,
              jsonb_build_object('item_key', it.item_key, 'item_label', it.item_label,
                                 'reminder_count', it.reminder_count));

      item_id := it.id; action := 'escalated'; RETURN NEXT;

    ELSE
      -- Auto-reminder branch: mirror handleReminder logic
      UPDATE public.client_setup_items
      SET item_status = 'reminded',
          last_reminded_at = now(),
          reminder_count = COALESCE(reminder_count, 0) + 1
      WHERE id = it.id;

      -- Mirror logNotificationSend
      INSERT INTO public.notification_send_log
        (client_id, setup_item_id, action_type, channel, subject, body_preview, send_status, metadata)
      VALUES (it.client_id, it.id, 'reminder', 'portal',
              'Reminder: ' || it.item_label,
              'Automated reminder: we still need "' || it.item_label || '" to continue your setup.',
              'queued',
              jsonb_build_object('item_key', it.item_key, 'auto', true,
                                 'reminder_count', COALESCE(it.reminder_count,0) + 1));

      INSERT INTO public.audit_logs (client_id, action, module, metadata)
      VALUES (it.client_id, 'setup_item_auto_reminded', 'setup_request',
              jsonb_build_object('item_id', it.id, 'item_key', it.item_key,
                                 'item_label', it.item_label,
                                 'reminder_count', COALESCE(it.reminder_count,0) + 1,
                                 'auto', true));

      INSERT INTO public.automation_events (client_id, event_type, event_key, event_name,
                                            related_type, related_id, event_data)
      VALUES (it.client_id, 'setup_item_auto_reminded', 'setup_item_auto_reminded',
              'Setup Item Auto-Reminded', 'setup_item', it.id,
              jsonb_build_object('item_key', it.item_key, 'item_label', it.item_label,
                                 'reminder_count', COALESCE(it.reminder_count,0) + 1));

      item_id := it.id; action := 'reminded'; RETURN NEXT;
    END IF;
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.run_setup_item_auto_reminder_scan(int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_setup_item_auto_reminder_scan(int, int) TO service_role;

-- Schedule daily
DO $$
DECLARE j bigint;
BEGIN
  SELECT jobid INTO j FROM cron.job WHERE jobname = 'setup-item-auto-reminder-daily-scan';
  IF j IS NOT NULL THEN PERFORM cron.unschedule(j); END IF;
END $$;

SELECT cron.schedule(
  'setup-item-auto-reminder-daily-scan',
  '25 13 * * *',
  $cron$ SELECT public.run_setup_item_auto_reminder_scan(5, 3); $cron$
);
