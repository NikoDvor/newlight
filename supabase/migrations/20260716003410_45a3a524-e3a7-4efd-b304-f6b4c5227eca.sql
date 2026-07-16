CREATE OR REPLACE FUNCTION public.run_webinar_reminder_scan()
 RETURNS TABLE(registration_id uuid, kind text, action text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  v_subject text;
  v_text text;
  v_html text;
  v_msg_id uuid;
  v_idem text;
  v_unsub text;
BEGIN
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

    INSERT INTO public.email_unsubscribe_tokens (email, token)
    VALUES (r.email, encode(gen_random_bytes(24), 'hex'))
    ON CONFLICT (email) DO NOTHING;
    SELECT token INTO v_unsub FROM public.email_unsubscribe_tokens WHERE email = r.email;

    v_subject := 'Reminder: "' || r.title || '" is tomorrow';
    v_text := 'Hi ' || r.full_name || ', this is a reminder that "' || r.title
              || '" starts at ' || to_char(r.scheduled_at, 'YYYY-MM-DD HH24:MI TZ') || '.';
    v_html := '<p>Hi ' || r.full_name || ',</p><p>This is a reminder that <strong>'
              || r.title || '</strong> starts at '
              || to_char(r.scheduled_at, 'YYYY-MM-DD HH24:MI TZ') || '.</p>';
    v_msg_id := gen_random_uuid();
    v_idem := 'webinar-reminder-24h-' || r.id::text;

    INSERT INTO public.notification_send_log
      (client_id, action_type, channel, recipient_email, subject, body_preview, send_status, metadata)
    VALUES (r.client_id, 'webinar_reminder_24h', 'email', r.email, v_subject, v_text, 'queued',
            jsonb_build_object('webinar_event_id', r.event_id, 'registration_id', r.id, 'kind','24h',
                               'message_id', v_msg_id));

    PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
      'to', r.email,
      'from', 'reminders@notify.newlightgen.com',
      'sender_domain', 'notify.newlightgen.com',
      'subject', v_subject,
      'html', v_html,
      'text', v_text,
      'purpose', 'transactional',
      'label', 'webinar_reminder_24h',
      'idempotency_key', v_idem,
      'unsubscribe_token', v_unsub,
      'message_id', v_msg_id,
      'queued_at', to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ));

    INSERT INTO public.automation_events (client_id, event_type, event_key, event_name,
                                          related_type, related_id, event_data)
    VALUES (r.client_id, 'webinar_reminder_sent', 'webinar_reminder_sent', 'Webinar Reminder Sent',
            'webinar_registration', r.id,
            jsonb_build_object('kind','24h','webinar_event_id', r.event_id, 'email', r.email));

    registration_id := r.id; kind := '24h'; action := 'sent'; RETURN NEXT;
  END LOOP;

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

    INSERT INTO public.email_unsubscribe_tokens (email, token)
    VALUES (r.email, encode(gen_random_bytes(24), 'hex'))
    ON CONFLICT (email) DO NOTHING;
    SELECT token INTO v_unsub FROM public.email_unsubscribe_tokens WHERE email = r.email;

    v_subject := 'Starting soon: "' || r.title || '"';
    v_text := 'Hi ' || r.full_name || ', "' || r.title || '" begins in about an hour.';
    v_html := '<p>Hi ' || r.full_name || ',</p><p><strong>' || r.title
              || '</strong> begins in about an hour.</p>';
    v_msg_id := gen_random_uuid();
    v_idem := 'webinar-reminder-1h-' || r.id::text;

    INSERT INTO public.notification_send_log
      (client_id, action_type, channel, recipient_email, subject, body_preview, send_status, metadata)
    VALUES (r.client_id, 'webinar_reminder_1h', 'email', r.email, v_subject, v_text, 'queued',
            jsonb_build_object('webinar_event_id', r.event_id, 'registration_id', r.id, 'kind','1h',
                               'message_id', v_msg_id));

    PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
      'to', r.email,
      'from', 'reminders@notify.newlightgen.com',
      'sender_domain', 'notify.newlightgen.com',
      'subject', v_subject,
      'html', v_html,
      'text', v_text,
      'purpose', 'transactional',
      'label', 'webinar_reminder_1h',
      'idempotency_key', v_idem,
      'unsubscribe_token', v_unsub,
      'message_id', v_msg_id,
      'queued_at', to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ));

    INSERT INTO public.automation_events (client_id, event_type, event_key, event_name,
                                          related_type, related_id, event_data)
    VALUES (r.client_id, 'webinar_reminder_sent', 'webinar_reminder_sent', 'Webinar Reminder Sent',
            'webinar_registration', r.id,
            jsonb_build_object('kind','1h','webinar_event_id', r.event_id, 'email', r.email));

    registration_id := r.id; kind := '1h'; action := 'sent'; RETURN NEXT;
  END LOOP;
END $function$;