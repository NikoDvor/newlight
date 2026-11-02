-- Packages & billing (Nov 2, 2026). Applied directly via SQL; kept here as a record. Idempotent.
-- Spec: project doc claude/packages-and-billing-spec.md. Engine: src/lib/packages.ts (= supabase/functions/_shared/packages.ts).

-- 1. Admin-editable package defaults (one row per package). Missing columns fall back to the engine's built-ins.
create table if not exists public.nl_package_defaults (
  key text primary key check (key in ('growth','command_center','enterprise')),
  label text, steps text,
  setup_fee numeric, monthly_fee numeric,
  setup_multiplier numeric, monthly_multiplier numeric, min_avg_client numeric,
  commission_rate numeric, commission_rate_ongoing numeric,
  annual_discount_pct numeric, payment_plan_markup_pct numeric, discount_approval_pct numeric,
  guarantee_days integer, min_ad_budget numeric,
  updated_by uuid, updated_at timestamptz not null default now()
);
insert into public.nl_package_defaults (key, label) values ('growth','Growth'),('command_center','Command Center'),('enterprise','Enterprise')
on conflict (key) do nothing;
alter table public.nl_package_defaults enable row level security;
drop policy if exists "package defaults read" on public.nl_package_defaults;
create policy "package defaults read" on public.nl_package_defaults for select to authenticated using (true);
drop policy if exists "package defaults admin write" on public.nl_package_defaults;
create policy "package defaults admin write" on public.nl_package_defaults for all to authenticated
  using (private.is_admin_or_operator(auth.uid())) with check (private.is_admin_or_operator(auth.uid()));
grant select, insert, update on public.nl_package_defaults to authenticated;

-- 2. Deal plan fields.
alter table public.crm_deals
  add column if not exists package text check (package in ('growth','command_center','enterprise')),
  add column if not exists avg_client_value numeric,
  add column if not exists payment_plan boolean not null default false,
  add column if not exists payment_plan_total numeric,
  add column if not exists has_guarantee boolean not null default false,
  add column if not exists guarantee_started_at timestamptz,
  add column if not exists guarantee_ends_at timestamptz,
  add column if not exists made_back_at timestamptz,
  add column if not exists made_back_confirmed_by uuid,
  add column if not exists billing_start_date date,
  add column if not exists annual_amount_first numeric,
  add column if not exists annual_amount_renewal numeric,
  add column if not exists annual_anchor_date date,
  add column if not exists custom_pricing boolean not null default false,
  add column if not exists pricing_defaults jsonb,
  add column if not exists price_approval_status text not null default 'not_needed'
    check (price_approval_status in ('not_needed','pending','approved','rejected')),
  add column if not exists price_approved_by uuid,
  add column if not exists price_approved_at timestamptz,
  add column if not exists setup_method text check (setup_method in ('stripe','wire')),
  add column if not exists recurring_method_saved_at timestamptz,
  add column if not exists work_paused_at timestamptz,
  add column if not exists work_paused_reason text,
  add column if not exists plan_preview jsonb;

-- 3. Every charge, scheduled ahead of time. The billing runner (nl-billing, daily) charges due Stripe rows,
--    retries failures (day 1, day 3) and pauses work; wire rows wait for admin "Wire received".
create table if not exists public.nl_billing_schedule (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.crm_deals(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null, -- provisioned (real) workspace
  kind text not null check (kind in ('setup','setup_installment_1','setup_installment_2','monthly','annual','annual_renewal','commission')),
  method text not null check (method in ('stripe','wire')),
  amount numeric,                 -- null until computed (commission)
  label text, covers text,
  period_start date, period_end date,
  due_date date not null,
  status text not null default 'scheduled' check (status in ('scheduled','processing','paid','failed','waived','cancelled')),
  attempts integer not null default 0,
  last_attempt_at timestamptz, next_retry_at timestamptz,
  failure_reason text,
  stripe_payment_intent_id text, stripe_checkout_session_id text,
  invoice_id uuid,
  wire_reference text,
  reminders_sent jsonb not null default '[]'::jsonb,
  paid_at timestamptz, paid_marked_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists nl_billing_schedule_due on public.nl_billing_schedule(status, due_date);
create index if not exists nl_billing_schedule_deal on public.nl_billing_schedule(deal_id, due_date);
create unique index if not exists nl_billing_schedule_uniq on public.nl_billing_schedule(deal_id, kind, due_date) where status <> 'cancelled';
alter table public.nl_billing_schedule enable row level security;
drop policy if exists "billing schedule admin" on public.nl_billing_schedule;
create policy "billing schedule admin" on public.nl_billing_schedule for all to authenticated
  using (private.is_admin_or_operator(auth.uid())) with check (private.is_admin_or_operator(auth.uid()));
drop policy if exists "billing schedule client read" on public.nl_billing_schedule;
create policy "billing schedule client read" on public.nl_billing_schedule for select to authenticated
  using (client_id is not null and private.user_has_client_access(auth.uid(), client_id));
drop policy if exists "billing schedule rep read" on public.nl_billing_schedule;
create policy "billing schedule rep read" on public.nl_billing_schedule for select to authenticated
  using (exists (select 1 from public.crm_deals d where d.id = deal_id and d.assigned_user = auth.uid()));
grant select, insert, update on public.nl_billing_schedule to authenticated;

-- 4. Revenue from new clients NewLight brought in (Growth): drives "made it back" and commission.
create table if not exists public.nl_attributed_revenue (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.crm_deals(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  new_client_label text not null,
  client_started_on date not null,
  month date not null,               -- first day of the month the revenue was recognized
  revenue numeric not null check (revenue >= 0),
  source text,                       -- google_ads / linkedin / tracking_number / pipeline / client_confirmed …
  entry_kind text not null default 'admin' check (entry_kind in ('admin','client_confirmed','pipeline')),
  entered_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists nl_attributed_revenue_deal on public.nl_attributed_revenue(deal_id, month);
alter table public.nl_attributed_revenue enable row level security;
drop policy if exists "attributed revenue admin" on public.nl_attributed_revenue;
create policy "attributed revenue admin" on public.nl_attributed_revenue for all to authenticated
  using (private.is_admin_or_operator(auth.uid())) with check (private.is_admin_or_operator(auth.uid()));
drop policy if exists "attributed revenue client" on public.nl_attributed_revenue;
create policy "attributed revenue client" on public.nl_attributed_revenue for select to authenticated
  using (client_id is not null and private.user_has_client_access(auth.uid(), client_id));
drop policy if exists "attributed revenue client add" on public.nl_attributed_revenue;
create policy "attributed revenue client add" on public.nl_attributed_revenue for insert to authenticated
  with check (client_id is not null and entry_kind = 'client_confirmed' and private.user_has_client_access(auth.uid(), client_id));
grant select, insert, update, delete on public.nl_attributed_revenue to authenticated;

-- 5. Wire instructions (admin only; Pay & Sign reads them server-side).
create table if not exists public.nl_wire_settings (
  id boolean primary key default true check (id),
  account_name text, bank_name text, routing_number text, account_number text,
  swift_code text, bank_address text, note text,
  updated_by uuid, updated_at timestamptz not null default now()
);
alter table public.nl_wire_settings enable row level security;
drop policy if exists "wire settings admin" on public.nl_wire_settings;
create policy "wire settings admin" on public.nl_wire_settings for all to authenticated
  using (private.is_admin_or_operator(auth.uid())) with check (private.is_admin_or_operator(auth.uid()));
grant select, insert, update on public.nl_wire_settings to authenticated;

-- 6. Notification log (dedupe reminders / alerts).
create table if not exists public.nl_billing_events (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references public.crm_deals(id) on delete cascade,
  schedule_id uuid references public.nl_billing_schedule(id) on delete cascade,
  kind text not null, dedupe_key text unique,
  detail jsonb, created_at timestamptz not null default now()
);
alter table public.nl_billing_events enable row level security;
drop policy if exists "billing events admin" on public.nl_billing_events;
create policy "billing events admin" on public.nl_billing_events for select to authenticated using (private.is_admin_or_operator(auth.uid()));
grant select on public.nl_billing_events to authenticated;

-- 7. Pause mirror on the client workspace (clients can't read crm_deals): drives the "work paused" banner.
alter table public.clients
  add column if not exists billing_paused_at timestamptz,
  add column if not exists billing_paused_reason text;
