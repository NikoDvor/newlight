-- Daily pull at 6:00pm Pacific all year. pg_cron runs in UTC, so fire at 01:00 and 02:00 UTC (Mon–Fri UTC = Sun–Thu
-- evening in LA) and only act on the one that is 18:00 in America/Los_Angeles (PDT → 01:00 UTC, PST → 02:00 UTC).
create or replace function public.nl_auto_pull_daily()
returns int language plpgsql security definer set search_path = public as $$
declare r record; n int := 0; local_now timestamp := now() at time zone 'America/Los_Angeles';
begin
  if not coalesce((select enabled from nl_lead_auto_pull_settings where id = 1), false) then return 0; end if;
  if extract(hour from local_now) <> 18 or extract(dow from local_now) not in (0, 1, 2, 3, 4) then return 0; end if;
  for r in
    select distinct t.rep_user_id from nl_lead_territories t
    join user_roles ur on ur.user_id = t.rep_user_id and ur.role = 'marketing_staff'
    where t.active and t.city is not null
  loop
    continue when exists (select 1 from nl_lead_auto_pull_log l where l.rep_user_id = r.rep_user_id
      and l.run_at > now() - interval '90 minutes');
    n := n + nl_auto_pull_for(r.rep_user_id);
  end loop;
  return n;
end $$;
revoke all on function public.nl_auto_pull_daily() from public, anon, authenticated;
select cron.unschedule('nl-lead-auto-pull-daily') where exists (select 1 from cron.job where jobname = 'nl-lead-auto-pull-daily');
select cron.schedule('nl-lead-auto-pull-daily', '0 1,2 * * 1-5', $c$select public.nl_auto_pull_daily();$c$);
