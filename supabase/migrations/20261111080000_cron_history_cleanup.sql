-- Prevent a repeat of the Nov 11 2026 outage: pg_cron's run history grew to 1.76 GB on the Tiny instance.
-- Every night at 11:15 UTC (3:15am PT standard / 4:15am PDT) delete run history older than 7 days. Touches no app data.
select cron.unschedule('nl-cron-history-cleanup') where exists (select 1 from cron.job where jobname = 'nl-cron-history-cleanup');
select cron.schedule('nl-cron-history-cleanup', '15 11 * * *', $c$delete from cron.job_run_details where end_time < now() - interval '7 days';$c$);
