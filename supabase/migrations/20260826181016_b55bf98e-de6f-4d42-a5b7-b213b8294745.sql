DO $$
DECLARE existing_jobid bigint;
BEGIN
  SELECT jobid INTO existing_jobid FROM cron.job WHERE jobname = 'bdr-unattended-sweep';
  IF existing_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(existing_jobid);
  END IF;
END $$;

SELECT cron.schedule(
  'bdr-unattended-sweep',
  '0 * * * *', -- hourly at minute 0
  $cron$
  SELECT net.http_post(
    url := 'https://irvrmkshjcyabjubihmp.supabase.co/functions/v1/bdr-unattended-sweep',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $cron$
);