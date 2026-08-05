CREATE OR REPLACE FUNCTION public.trigger_booking_confirmation_sms()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.source = 'booking_form' THEN
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
$function$;