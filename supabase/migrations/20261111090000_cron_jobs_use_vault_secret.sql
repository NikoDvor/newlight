-- Since the Nov 7 security hardening, scheduled functions require the cron secret. Several jobs still sent only the
-- public anon key (or a vault secret named CRON_SECRET that doesn't exist), so every call was rejected (401):
-- meeting reminders (24h/3h/15m), speed alerts, training health, client payment reminders, attribution matching.
-- All jobs now send the vault NL_BILLING_CRON_SECRET, which _shared/auth.ts cronAuthorized() accepts.
do $$
declare base text := 'https://irvrmkshjcyabjubihmp.supabase.co/functions/v1/';
 hdr text := $h$jsonb_build_object('Content-Type','application/json','x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='NL_BILLING_CRON_SECRET' limit 1))$h$;
 r record;
begin
 for r in select * from (values
   ('nl-speed-alerts-5min','nl-speed-alerts',$b$'{}'::jsonb$b$),
   ('meeting-reminder-scan','meeting-reminder-scan',$b$jsonb_build_object('scheduled_at', now())$b$),
   ('process-meeting-reminders-every-5-min','process-meeting-reminders',$b$jsonb_build_object('action','process_queue')$b$),
   ('nl-training-health-nightly','check-training-health',$b$'{}'::jsonb$b$),
   ('client-payment-reminders-daily','client-payment-reminders',$b$jsonb_build_object('time', now())$b$),
   ('match-attribution-to-deals-daily','match-attribution-to-deals',$b$'{}'::jsonb$b$)
 ) v(job, fn, body) loop
   if exists (select 1 from cron.job where jobname = r.job) then
     perform cron.alter_job((select jobid from cron.job where jobname = r.job),
       command := format('select net.http_post(url := %L, headers := %s, body := %s);', base || r.fn, hdr, r.body));
   end if;
 end loop;
end $$;
