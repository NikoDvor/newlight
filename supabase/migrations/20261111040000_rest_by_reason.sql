-- Rest length by why they said no (was a flat 180 days), the reason saved on the firm, and re-activation tracking.
-- Applied directly in SQL on Nov 11 2026; nl_pool_recycle was edited in place (rule 1 sets reactivated_at,
-- rule 5 uses nl_rest_days(reason) and saves rest_reason/rested_at, rule 6 saves its reason).
alter table public.nl_lead_pool_firms add column if not exists rest_reason text;
alter table public.nl_lead_pool_firms add column if not exists rested_at timestamptz;
alter table public.nl_lead_pool_firms add column if not exists reactivated_at timestamptz;

create or replace function public.nl_rest_days(_reason text) returns int language sql immutable as $$
  select case coalesce(_reason, '')
    when 'went_silent' then 60
    when 'Too Expensive' then 90 when 'too_expensive' then 90 when 'no_budget' then 90 when 'contract_concerns' then 90
    when 'doesnt_understand' then 90
    when 'Don''t See the Value' then 120 when 'no_value' then 120 when 'doesnt_believe' then 120 when 'too_risky' then 120
    when 'no_commission_pricing' then 120 when 'partner_said_no' then 120 when 'at_capacity' then 120
    when 'Not Interested' then 180 when 'Not interested' then 180 when 'not_interested' then 180 when 'Lost' then 180
    when 'Bad Experience' then 180 when 'bad_experience' then 180 when 'compliance' then 180 when 'no_more_clients' then 180
    when 'data_privacy_ai' then 180
    when 'Already Have Someone' then 270 when 'In-House Team' then 365 when 'has_agency' then 270 when 'chose_competitor' then 270
    when 'old_school' then 270 when 'referral_only' then 270
    when 'firm_sold' then 365 when 'retiring' then 365
    else 180 end
$$;

create or replace function public.nl_pool_reactivation()
returns table (rest_reason text, rested int, back_in_pool int, booked_after_return int, booked_pct numeric)
language sql stable security definer set search_path = public as $$
  select coalesce(p.rest_reason, 'Unknown'), count(*)::int,
    count(*) filter (where coalesce(p.recycle_count,0) > 0)::int,
    count(*) filter (where p.reactivated_at is not null)::int,
    round(100.0 * count(*) filter (where p.reactivated_at is not null) / nullif(count(*) filter (where coalesce(p.recycle_count,0) > 0), 0), 1)
  from nl_lead_pool_firms p
  where p.rest_reason is not null and private.is_admin_or_operator(auth.uid())
  group by 1 order by 2 desc
$$;
grant execute on function public.nl_pool_reactivation() to authenticated;

-- Nov 11 2026 outage: pg_cron's run history (cron.job_run_details) had grown to 1.76 GB on the Tiny instance.
-- Cleared once by hand (truncate). No automatic cleanup scheduled (owner's choice).
