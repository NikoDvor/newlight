-- Round-robin Form 1 bookings (source 'round_robin') now get the same
-- confirmation, Zoom link and client account as direct bookings.
-- Previously only source 'booking_form' fired booking-confirmation-sms.
create or replace function public.trigger_booking_confirmation_sms() returns trigger language plpgsql security definer set search_path = public as $fn$
BEGIN
  -- Form 1 bookings (direct or round-robin). Rescheduled copies are handled by meeting-reschedule-notice.
  IF NEW.source IN ('booking_form','round_robin') AND coalesce(NEW.reschedule_count,0) = 0 THEN
    PERFORM net.http_post(
      url := 'https://irvrmkshjcyabjubihmp.supabase.co/functions/v1/booking-confirmation-sms',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlydnJta3NoamN5YWJqdWJpaG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNDgxMTYsImV4cCI6MjA4ODkyNDExNn0.LHyFEq1NAKEI31D0C91y9JsuFam4HaEUUYMU6VjIe0A',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlydnJta3NoamN5YWJqdWJpaG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNDgxMTYsImV4cCI6MjA4ODkyNDExNn0.LHyFEq1NAKEI31D0C91y9JsuFam4HaEUUYMU6VjIe0A'
      ),
      body := jsonb_build_object('type','INSERT','table','bdr_calendar_events','record', row_to_json(NEW))
    );
  END IF;
  RETURN NEW;
END;
$fn$;
