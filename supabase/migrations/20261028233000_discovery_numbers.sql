-- Discovery numbers (Oct 28, 2026): the prospect's own numbers a salesman
-- enters on the discovery call, saved per lead. The Discovery Numbers panel
-- (Prospect mode of the Pipeline Revenue Opportunity visuals) calculates
-- average ticket, close rate, the gap to their goal and the missed revenue
-- opportunity from these. One row per lead; reopened on the closing call.
-- Periods: 'year' or 'month' — the app converts everything to a year.

create table if not exists public.nl_discovery_numbers (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.nl_bdr_leads(id) on delete cascade,
  user_id uuid not null,                       -- salesman who owns the lead
  event_id uuid references public.bdr_calendar_events(id) on delete set null,
  firm_type text not null default 'ria' check (firm_type in ('ria','insurance')),
  goal_revenue numeric check (goal_revenue is null or goal_revenue >= 0),
  goal_revenue_period text not null default 'year' check (goal_revenue_period in ('year','month')),
  goal_clients numeric check (goal_clients is null or goal_clients >= 0),
  current_revenue numeric check (current_revenue is null or current_revenue >= 0),
  current_revenue_period text not null default 'year' check (current_revenue_period in ('year','month')),
  current_clients numeric check (current_clients is null or current_clients >= 0),
  new_leads numeric check (new_leads is null or new_leads >= 0),
  new_leads_period text not null default 'year' check (new_leads_period in ('year','month')),
  leads_per_client numeric check (leads_per_client is null or leads_per_client > 0),
  -- The modelled "our contribution" scenario from the sliders (annual).
  model_leads numeric,
  model_close_rate numeric check (model_close_rate is null or (model_close_rate >= 0 and model_close_rate <= 1)),
  model_ticket numeric,
  updated_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists nl_discovery_numbers_user_idx on public.nl_discovery_numbers(user_id);

drop trigger if exists nl_discovery_numbers_updated_at on public.nl_discovery_numbers;
create trigger nl_discovery_numbers_updated_at before update on public.nl_discovery_numbers
  for each row execute function public.update_updated_at_column();

alter table public.nl_discovery_numbers enable row level security;
drop policy if exists nl_discovery_numbers_admin on public.nl_discovery_numbers;
create policy nl_discovery_numbers_admin on public.nl_discovery_numbers for all to authenticated
  using (private.is_admin_or_operator(auth.uid())) with check (private.is_admin_or_operator(auth.uid()));
drop policy if exists nl_discovery_numbers_own on public.nl_discovery_numbers;
create policy nl_discovery_numbers_own on public.nl_discovery_numbers for all to authenticated
  using (exists (select 1 from public.nl_bdr_leads l where l.id = lead_id and l.user_id = auth.uid()))
  with check (exists (select 1 from public.nl_bdr_leads l where l.id = lead_id and l.user_id = auth.uid()));
grant select, insert, update, delete on public.nl_discovery_numbers to authenticated;
