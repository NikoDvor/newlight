DELETE FROM public.email_send_log WHERE recipient_email LIKE 'test-reminder%@example.com';
DELETE FROM public.notification_send_log WHERE recipient_email LIKE 'test-reminder%@example.com';
DELETE FROM public.automation_events WHERE related_type='webinar_registration'
  AND related_id IN (SELECT id FROM public.webinar_registrations WHERE email LIKE 'test-reminder%@example.com');
DELETE FROM public.webinar_registrations WHERE email LIKE 'test-reminder%@example.com';
DELETE FROM public.webinar_events WHERE title='TEST Webinar Reminder';
DELETE FROM public.email_unsubscribe_tokens WHERE email LIKE 'test-reminder%@example.com';