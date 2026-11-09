-- Keeps the "NewLight Account" training workspace current: once a day every date in it moves forward by the
-- days that have passed, so meetings stay upcoming, "this week / this month" stay meaningful and every rate,
-- price and relationship between records is unchanged. Only touches workspaces listed in nl_demo_state.
create table if not exists public.nl_demo_state (
  client_id uuid primary key references public.clients(id) on delete cascade,
  as_of date not null,
  last_rolled_at timestamptz
);
alter table public.nl_demo_state enable row level security;
drop policy if exists "Admins read demo state" on public.nl_demo_state;
create policy "Admins read demo state" on public.nl_demo_state for select using (private.is_admin_or_operator(auth.uid()));

create or replace function public.nl_demo_roll_forward()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare r record; n int; dl interval; total int := 0;
begin
  for r in select * from nl_demo_state loop
    n := (now() at time zone 'America/Los_Angeles')::date - r.as_of;
    continue when n <= 0;
    dl := make_interval(days => n);
    update crm_deals set created_at=created_at+dl, updated_at=updated_at+dl, close_date=close_date+n, expected_close_date=expected_close_date+n,
      lost_at=lost_at+dl, billing_start_date=billing_start_date+n, guarantee_started_at=guarantee_started_at+dl, guarantee_ends_at=guarantee_ends_at+dl,
      made_back_at=made_back_at+dl, annual_anchor_date=annual_anchor_date+n where client_id=r.client_id;
    update crm_contacts set created_at=created_at+dl, updated_at=updated_at+dl, first_contact_date=first_contact_date+dl, last_interaction_date=last_interaction_date+dl where client_id=r.client_id;
    update crm_companies set created_at=created_at+dl, updated_at=updated_at+dl where client_id=r.client_id;
    update sales_meetings set start_time=start_time+dl, end_time=end_time+dl, created_at=created_at+dl where client_id=r.client_id;
    update appointments set start_time=start_time+dl, end_time=end_time+dl, created_at=created_at+dl, meeting_started_at=meeting_started_at+dl, meeting_ended_at=meeting_ended_at+dl where client_id=r.client_id;
    update client_call_outcomes set logged_at=logged_at+dl, created_at=created_at+dl where client_id=r.client_id;
    update financial_adjustments set created_at=created_at+dl where client_id=r.client_id;
    update invoices set issued_at=issued_at+dl, paid_at=paid_at+dl, sent_at=sent_at+dl, due_date=due_date+n, period_start=period_start+n, period_end=period_end+n, created_at=created_at+dl where client_id=r.client_id;
    update subscriptions set contract_start_date=contract_start_date+n, contract_end_date=contract_end_date+n, next_invoice_date=next_invoice_date+n, last_invoice_date=last_invoice_date+n, created_at=created_at+dl where client_id=r.client_id;
    update billing_accounts set created_at=created_at+dl where client_id=r.client_id;
    update proposals set sent_at=sent_at+dl, viewed_at=viewed_at+dl, accepted_at=accepted_at+dl, declined_at=declined_at+dl, expires_at=expires_at+dl, created_at=created_at+dl where client_id=r.client_id;
    update follow_up_queues set due_at=due_at+dl, created_at=created_at+dl where client_id=r.client_id;
    update crm_tasks set due_date=due_date+dl, created_at=created_at+dl where client_id=r.client_id;
    update crm_activities set created_at=created_at+dl where client_id=r.client_id;
    update review_requests set sent_at=sent_at+dl, opened_at=opened_at+dl, feedback_at=feedback_at+dl, created_at=created_at+dl where client_id=r.client_id;
    update client_signal_snapshots set computed_at=computed_at+dl where client_id=r.client_id;
    update ai_recommendations set generated_at=generated_at+dl where client_id=r.client_id;
    update client_health_scores set calculated_at=calculated_at+dl where client_id=r.client_id;
    update nl_demo_state set as_of = as_of + n, last_rolled_at = now() where client_id=r.client_id;
    total := total + n;
  end loop;
  return total;
end $$;
revoke all on function public.nl_demo_roll_forward() from public, anon, authenticated;

insert into public.nl_demo_state (client_id, as_of) values ('6e1a0c00-0000-4000-8000-00000000a001', '2026-11-07')
on conflict (client_id) do nothing;

select cron.unschedule('nl-demo-roll-forward') where exists (select 1 from cron.job where jobname='nl-demo-roll-forward');
select cron.schedule('nl-demo-roll-forward', '10 8 * * *', $cron$select public.nl_demo_roll_forward()$cron$);
