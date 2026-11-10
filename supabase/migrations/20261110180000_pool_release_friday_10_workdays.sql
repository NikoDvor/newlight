-- Untouched imported (AdvizorPro pool) leads go back to the pool on Friday nights once they've sat 10 work days
-- (Mon–Fri, Los Angeles dates) with no call, outcome or stage change. Lead Sourcing leads are never touched (not pool leads).
-- Replaces rule 2 of nl_pool_recycle (3 calendar days), which is now disabled in that function.
create or replace function public.nl_workdays_between(_from timestamptz, _to timestamptz)
returns int language sql immutable as $$
  select count(*)::int from generate_series((_from at time zone 'America/Los_Angeles')::date + 1,
                                            (_to at time zone 'America/Los_Angeles')::date, interval '1 day') g
  where extract(isodow from g) < 6
$$;

create or replace function public.nl_pool_release_untouched()
returns int language plpgsql security definer set search_path = public as $$
declare a int; local_now timestamp := now() at time zone 'America/Los_Angeles';
begin
  if extract(hour from local_now) <> 21 or extract(isodow from local_now) <> 5 then return 0; end if;
  with idle as (
    select p.id, p.lead_id from nl_lead_pool_firms p join nl_bdr_leads l on l.id = p.lead_id
    where p.status = 'claimed' and l.pool_firm_id is not null
      and nl_workdays_between(p.claimed_at, now()) >= 10
      and not exists (select 1 from nl_lead_call_log g where g.lead_id = p.lead_id)
      and not exists (select 1 from bdr_call_outcomes o where o.lead_id = p.lead_id)
      and coalesce(l.called, false) = false and coalesce(l.pipeline_stage, 'cold') = 'cold'
      and jsonb_array_length(coalesce(l.outcome_history, '[]'::jsonb)) = 0
  ), del as (delete from nl_bdr_leads l using idle where l.id = idle.lead_id returning idle.id)
  update nl_lead_pool_firms p set status = 'available', previous_owner_ids = array_append(previous_owner_ids, owner_rep_id),
     owner_rep_id = null, lead_id = null, claimed_at = null, updated_at = now()
  from del where p.id = del.id;
  get diagnostics a = row_count;
  return a;
end $$;
revoke all on function public.nl_pool_release_untouched() from public, anon, authenticated;
-- 04:00 / 05:00 UTC Saturday = 9pm Friday Pacific (PDT / PST); the function acts only at 9pm LA time.
select cron.unschedule('nl-pool-release-untouched-friday') where exists (select 1 from cron.job where jobname = 'nl-pool-release-untouched-friday');
select cron.schedule('nl-pool-release-untouched-friday', '0 4,5 * * 6', $c$select public.nl_pool_release_untouched();$c$);
-- In nl_pool_recycle, rule 2's "p.claimed_at < now()-interval '3 days'" was replaced with "false" (applied directly in SQL).
