-- Rep scorecard, coaching notes, no-shows-to-rebook, admin cash/revenue overview.
create table if not exists public.nl_coaching_notes (
  id uuid primary key default gen_random_uuid(),
  rep_user_id uuid not null,
  author_id uuid not null default auth.uid(),
  note text not null check (length(btrim(note)) > 0),
  created_at timestamptz not null default now()
);
create index if not exists nl_coaching_notes_rep_idx on public.nl_coaching_notes (rep_user_id, created_at desc);
alter table public.nl_coaching_notes enable row level security;
drop policy if exists "coach admin all" on public.nl_coaching_notes;
create policy "coach admin all" on public.nl_coaching_notes for all to authenticated
  using (private.is_admin_or_operator(auth.uid())) with check (private.is_admin_or_operator(auth.uid()));
drop policy if exists "coach rep reads own" on public.nl_coaching_notes;
create policy "coach rep reads own" on public.nl_coaching_notes for select to authenticated
  using (rep_user_id = auth.uid());

-- One rep's numbers over the last p_days (1 = today). Reps may only read themselves.
create or replace function public.nl_rep_scorecard(p_user uuid default auth.uid(), p_days int default 1)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare since timestamptz; r jsonb;
begin
  if p_user is distinct from auth.uid() and not private.is_admin_or_operator(auth.uid()) then
    raise exception 'Not allowed';
  end if;
  since := case when p_days <= 1 then date_trunc('day', now() at time zone 'America/Los_Angeles') at time zone 'America/Los_Angeles'
                else now() - make_interval(days => p_days) end;
  select jsonb_build_object(
    'dials',    (select count(*) from nl_bdr_dial_log d where d.bdr_user_id = p_user and d.dialed_at >= since),
    'booked',   (select count(*) from bdr_calendar_events e where e.user_id = p_user and coalesce(e.is_extra,false) = false and e.lead_id is not null and e.created_at >= since),
    'held',     (select count(*) from bdr_calendar_events e where e.user_id = p_user and e.attendance = 'attended' and e.starts_at >= since),
    'no_shows', (select count(*) from bdr_calendar_events e where e.user_id = p_user and e.attendance = 'no_show' and e.starts_at >= since),
    'closed',   (select count(*) from crm_deals c where c.assigned_user = p_user and c.pipeline_stage = 'closed_won' and coalesce(c.close_date::timestamptz, c.paid_signed_at, c.updated_at) >= since)
  ) into r;
  return r;
end $$;
revoke all on function public.nl_rep_scorecard(uuid, int) from public, anon;
grant execute on function public.nl_rep_scorecard(uuid, int) to authenticated;

-- Admin: every salesman in one table.
create or replace function public.nl_rep_scorecard_all(p_days int default 7)
returns table (user_id uuid, dials bigint, booked bigint, held bigint, no_shows bigint, closed bigint, last_note timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not private.is_admin_or_operator(auth.uid()) then raise exception 'Admins only'; end if;
  return query
  select ur.user_id,
    (nl_rep_scorecard(ur.user_id, p_days)->>'dials')::bigint,
    (nl_rep_scorecard(ur.user_id, p_days)->>'booked')::bigint,
    (nl_rep_scorecard(ur.user_id, p_days)->>'held')::bigint,
    (nl_rep_scorecard(ur.user_id, p_days)->>'no_shows')::bigint,
    (nl_rep_scorecard(ur.user_id, p_days)->>'closed')::bigint,
    (select max(n.created_at) from nl_coaching_notes n where n.rep_user_id = ur.user_id)
  from user_roles ur where ur.role = 'marketing_staff';
end $$;
revoke all on function public.nl_rep_scorecard_all(int) from public, anon;
grant execute on function public.nl_rep_scorecard_all(int) to authenticated;

-- A rep's recent no-shows that have no later meeting on the same lead.
create or replace function public.nl_noshows_to_rebook(p_user uuid default auth.uid())
returns table (event_id uuid, lead_id uuid, title text, starts_at timestamptz, link_sent boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if p_user is distinct from auth.uid() and not private.is_admin_or_operator(auth.uid()) then
    raise exception 'Not allowed';
  end if;
  return query
  select e.id, e.lead_id, e.title, e.starts_at, (e.metadata ? 'rebook_link_sent_at')
  from bdr_calendar_events e
  where e.user_id = p_user and e.attendance = 'no_show' and e.starts_at >= now() - interval '14 days'
    and not exists (select 1 from bdr_calendar_events n where n.lead_id is not distinct from e.lead_id and e.lead_id is not null and n.id <> e.id and n.starts_at > e.starts_at)
  order by e.starts_at desc;
end $$;
revoke all on function public.nl_noshows_to_rebook(uuid) from public, anon;
grant execute on function public.nl_noshows_to_rebook(uuid) to authenticated;

-- Admin: cash view. Excludes the internal practice workspace; MRR counts only deals that have paid and signed.
create or replace function public.nl_revenue_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare m timestamptz := date_trunc('month', now()); r jsonb;
begin
  if not private.is_admin_or_operator(auth.uid()) then raise exception 'Admins only'; end if;
  with real_deals as (
    select d.* from crm_deals d
    where d.client_id is distinct from '6e1a0c00-0000-4000-8000-00000000a001'::uuid
  ), real_bill as (
    select b.* from nl_billing_schedule b where b.deal_id in (select id from real_deals)
  )
  select jsonb_build_object(
    'mrr',            coalesce((select sum(recurring_fee) from real_deals where pipeline_stage = 'closed_won' and paid_signed_at is not null and work_paused_at is null), 0),
    'collected_month',coalesce((select sum(amount) from real_bill where status = 'paid' and paid_at >= m), 0),
    'setup_month',    coalesce((select sum(amount) from real_bill where status = 'paid' and paid_at >= m and kind ilike '%setup%'), 0),
    'collected_all',  coalesce((select sum(amount) from real_bill where status = 'paid'), 0),
    'due_30d',        coalesce((select sum(amount) from real_bill where status <> 'paid' and due_date between current_date and current_date + 30), 0),
    'overdue',        coalesce((select sum(amount) from real_bill where status <> 'paid' and due_date < current_date), 0),
    'overdue_count',  (select count(*) from real_bill where status <> 'paid' and due_date < current_date),
    'open_pipeline',  coalesce((select sum(coalesce(initial_fee, deal_value, 0)) from real_deals where pipeline_stage in ('appointment_booked','qualified','proposal_sent','negotiation')), 0),
    'open_deals',     (select count(*) from real_deals where pipeline_stage in ('appointment_booked','qualified','proposal_sent','negotiation')),
    'won_month',      (select count(*) from real_deals where pipeline_stage = 'closed_won' and paid_signed_at >= m),
    'payouts_month',  coalesce((select sum(total) from nl_commission_payouts where sent_on >= m::date), 0),
    'payouts_all',    coalesce((select sum(total) from nl_commission_payouts), 0)
  ) into r;
  return r;
end $$;
revoke all on function public.nl_revenue_overview() from public, anon;
grant execute on function public.nl_revenue_overview() to authenticated;
