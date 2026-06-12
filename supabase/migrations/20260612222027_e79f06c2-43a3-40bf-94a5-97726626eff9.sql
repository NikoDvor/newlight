CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
DECLARE
  existing_jobid bigint;
BEGIN
  SELECT jobid INTO existing_jobid FROM cron.job WHERE jobname = 'seo-weekly-refresh';
  IF existing_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(existing_jobid);
  END IF;
END $$;

SELECT cron.schedule(
  'seo-weekly-refresh',
  '0 14 * * 1', -- Mondays 06:00 America/Los_Angeles (PST = 14:00 UTC)
  $cron$
  SELECT net.http_post(
    url := 'https://irvrmkshjcyabjubihmp.supabase.co/functions/v1/seo-generate-plan',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body := '{"refresh_all": true}'::jsonb
  );
  $cron$
);