-- Commission ledger for 1099 reps, paid by the owner's own bank wire/ACH.
-- Flow: sale (who gets credit) -> client payment received -> funds clear -> commission earned (due 3 business days later)
--       -> owner sends wire/ACH and records it -> matched to the bank statement -> year-end 1099 totals.
-- Never stores SSNs or bank account numbers. Bank *references* (wire confirmation / ACH trace) are fine.

create table if not exists public.nl_bank_holidays (d date primary key, name text not null);
alter table public.nl_bank_holidays enable row level security;
drop policy if exists "bank holidays read" on public.nl_bank_holidays;
create policy "bank holidays read" on public.nl_bank_holidays for select to authenticated using (true);
drop policy if exists "bank holidays admin" on public.nl_bank_holidays;
create policy "bank holidays admin" on public.nl_bank_holidays for all to authenticated
  using (private.has_role(auth.uid(), 'admin'::app_role)) with check (private.has_role(auth.uid(), 'admin'::app_role));
-- Federal Reserve holidays (when a holiday falls on Saturday the Fed stays open the Friday before)
insert into public.nl_bank_holidays (d, name) values
('2026-01-01','New Year''s Day'),('2026-01-19','Martin Luther King Jr. Day'),('2026-02-16','Presidents Day'),('2026-05-25','Memorial Day'),
('2026-06-19','Juneteenth'),('2026-09-07','Labor Day'),('2026-10-12','Columbus Day'),('2026-11-11','Veterans Day'),('2026-11-26','Thanksgiving'),
('2026-12-25','Christmas'),
('2027-01-01','New Year''s Day'),('2027-01-18','Martin Luther King Jr. Day'),('2027-02-15','Presidents Day'),('2027-05-31','Memorial Day'),
('2027-07-05','Independence Day (observed)'),('2027-09-06','Labor Day'),('2027-10-11','Columbus Day'),('2027-11-11','Veterans Day'),
('2027-11-25','Thanksgiving'),
('2028-01-17','Martin Luther King Jr. Day'),('2028-02-21','Presidents Day'),('2028-05-29','Memorial Day'),('2028-06-19','Juneteenth'),
('2028-07-04','Independence Day'),('2028-09-04','Labor Day'),('2028-10-09','Columbus Day'),('2028-11-23','Thanksgiving'),('2028-12-25','Christmas')
on conflict (d) do nothing;

create or replace function public.nl_add_business_days(p_from date, p_n int)
returns date language plpgsql stable set search_path = public as $$
declare cur date := p_from; left_ int := p_n;
begin
  while left_ > 0 loop
    cur := cur + 1;
    if extract(isodow from cur) < 6 and not exists (select 1 from nl_bank_holidays h where h.d = cur) then left_ := left_ - 1; end if;
  end loop;
  return cur;
end $$;

-- A sale: one client deal and the setup fee commission is figured on
create table if not exists public.nl_commission_sales (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references public.crm_deals(id) on delete set null,
  client_name text not null,
  setup_fee numeric not null check (setup_fee > 0),      -- the regular setup amount (never the +10% plan markup)
  installments int not null default 1 check (installments in (1, 2)),
  signed_on date not null default current_date,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create unique index if not exists nl_commission_sales_deal on public.nl_commission_sales (deal_id) where deal_id is not null;

-- Who gets credit on a sale
create table if not exists public.nl_commission_credits (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.nl_commission_sales(id) on delete cascade,
  hire_id uuid not null references public.nl_contractor_hires(id),
  role text not null check (role in ('setter','closer')),
  rate numeric not null check (rate > 0 and rate <= 0.5),
  created_at timestamptz not null default now(),
  unique (sale_id, hire_id, role)
);

-- Money the client actually paid us for the setup fee
create table if not exists public.nl_commission_client_payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.nl_commission_sales(id) on delete cascade,
  installment_no int not null default 1 check (installment_no in (1, 2)),
  amount numeric not null check (amount > 0),
  method text not null check (method in ('wire','ach','card','stripe')),
  received_on date not null,
  cleared_on date not null,
  bank_reference text,
  billing_schedule_id uuid unique references public.nl_billing_schedule(id) on delete set null,
  refunded_at timestamptz,
  refund_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (sale_id, installment_no)
);

-- One line per commission owed (negative lines are reversals netted from the next payout)
create table if not exists public.nl_commission_entries (
  id uuid primary key default gen_random_uuid(),
  hire_id uuid not null references public.nl_contractor_hires(id),
  sale_id uuid not null references public.nl_commission_sales(id) on delete cascade,
  client_payment_id uuid references public.nl_commission_client_payments(id) on delete cascade,
  role text not null,
  rate numeric not null,
  base_amount numeric not null,
  amount numeric not null,
  status text not null default 'earned' check (status in ('earned','paid','reversed')),
  earned_on date not null,        -- the day the client's money cleared
  due_on date not null,           -- 3 business days later
  payout_id uuid,
  reverses_entry_id uuid references public.nl_commission_entries(id),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists nl_commission_entries_hire on public.nl_commission_entries (hire_id, status);

-- A wire/ACH the owner sent
create table if not exists public.nl_commission_payouts (
  id uuid primary key default gen_random_uuid(),
  hire_id uuid not null references public.nl_contractor_hires(id),
  total numeric not null check (total > 0),
  method text not null check (method in ('wire','ach')),
  sent_on date not null,
  bank_reference text not null,
  note text,
  reconciled_at timestamptz,
  reconciled_by uuid,
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.nl_commission_entries drop constraint if exists nl_commission_entries_payout_fk;
alter table public.nl_commission_entries add constraint nl_commission_entries_payout_fk foreign key (payout_id) references public.nl_commission_payouts(id);

do $$ declare t text; begin
  foreach t in array array['nl_commission_sales','nl_commission_credits','nl_commission_client_payments','nl_commission_entries','nl_commission_payouts'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s admin" on public.%I', t, t);
    execute format('create policy "%s admin" on public.%I for all to authenticated using (private.has_role(auth.uid(), ''admin''::app_role)) with check (private.has_role(auth.uid(), ''admin''::app_role))', t, t);
  end loop;
end $$;

-- When the client's money counts as cleared
create or replace function public.nl_commission_cleared_on(p_method text, p_received date)
returns date language sql stable set search_path = public as $$
  select case when p_method = 'ach' then nl_add_business_days(p_received, 3) else p_received end
$$;

-- Turn one client payment into commission lines for everyone credited on the sale
create or replace function public.nl_commission_make_entries(p_payment_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare p record; s record; c record; base numeric;
begin
  select * into p from nl_commission_client_payments where id = p_payment_id;
  if p is null or p.refunded_at is not null then return; end if;
  select * into s from nl_commission_sales where id = p.sale_id;
  base := least(p.amount, round(s.setup_fee / s.installments, 2));
  for c in select * from nl_commission_credits where sale_id = s.id loop
    if not exists (select 1 from nl_commission_entries e where e.client_payment_id = p.id and e.hire_id = c.hire_id and e.role = c.role and e.reverses_entry_id is null) then
      insert into nl_commission_entries (hire_id, sale_id, client_payment_id, role, rate, base_amount, amount, earned_on, due_on)
      values (c.hire_id, s.id, p.id, c.role, c.rate, base, round(base * c.rate, 2), p.cleared_on, nl_add_business_days(p.cleared_on, 3));
    end if;
  end loop;
end $$;

create or replace function public.nl_commission_payment_trg()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.received_on is distinct from old.received_on or new.method is distinct from old.method then
    new.cleared_on := nl_commission_cleared_on(new.method, new.received_on);
  end if;
  return new;
end $$;
drop trigger if exists nl_commission_payment_bi on public.nl_commission_client_payments;
create trigger nl_commission_payment_bi before insert or update on public.nl_commission_client_payments
  for each row execute function public.nl_commission_payment_trg();

create or replace function public.nl_commission_payment_after()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform nl_commission_make_entries(new.id);
  return null;
end $$;
drop trigger if exists nl_commission_payment_ai on public.nl_commission_client_payments;
create trigger nl_commission_payment_ai after insert on public.nl_commission_client_payments
  for each row execute function public.nl_commission_payment_after();

-- Adding someone's credit after a payment already came in still creates their lines
create or replace function public.nl_commission_credit_after()
returns trigger language plpgsql security definer set search_path = public as $$
declare p record;
begin
  for p in select id from nl_commission_client_payments where sale_id = new.sale_id and refunded_at is null loop
    perform nl_commission_make_entries(p.id);
  end loop;
  return null;
end $$;
drop trigger if exists nl_commission_credit_ai on public.nl_commission_credits;
create trigger nl_commission_credit_ai after insert on public.nl_commission_credits
  for each row execute function public.nl_commission_credit_after();

-- Pull in setup payments already marked paid in billing (wire received / Stripe paid) for a linked deal
create or replace function public.nl_commission_sync_sale(p_sale_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare s record; b record; n int := 0; inst int;
begin
  select * into s from nl_commission_sales where id = p_sale_id;
  if s is null or s.deal_id is null then return 0; end if;
  for b in select * from nl_billing_schedule where deal_id = s.deal_id and status = 'paid'
             and kind in ('setup','setup_installment_1','setup_installment_2','annual') order by due_date loop
    inst := case when b.kind = 'setup_installment_2' then 2 else 1 end;
    if not exists (select 1 from nl_commission_client_payments where billing_schedule_id = b.id or (sale_id = s.id and installment_no = inst)) then
      insert into nl_commission_client_payments (sale_id, installment_no, amount, method, received_on, cleared_on, bank_reference, billing_schedule_id)
      values (s.id, inst, coalesce(b.amount, s.setup_fee / s.installments), case when b.method = 'wire' then 'wire' else 'stripe' end,
              coalesce(b.paid_at, now())::date, coalesce(b.paid_at, now())::date, b.wire_reference, b.id);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

create or replace function public.nl_commission_sale_after()
returns trigger language plpgsql security definer set search_path = public as $$
begin perform nl_commission_sync_sale(new.id); return null; end $$;
drop trigger if exists nl_commission_sale_ai on public.nl_commission_sales;
create trigger nl_commission_sale_ai after insert on public.nl_commission_sales
  for each row execute function public.nl_commission_sale_after();

create or replace function public.nl_commission_billing_after()
returns trigger language plpgsql security definer set search_path = public as $$
declare s record;
begin
  if new.status = 'paid' and (old.status is distinct from 'paid') and new.kind in ('setup','setup_installment_1','setup_installment_2','annual') then
    for s in select id from nl_commission_sales where deal_id = new.deal_id loop
      perform nl_commission_sync_sale(s.id);
    end loop;
  end if;
  return null;
end $$;
drop trigger if exists nl_commission_billing_au on public.nl_billing_schedule;
create trigger nl_commission_billing_au after update on public.nl_billing_schedule
  for each row execute function public.nl_commission_billing_after();

-- Client refund / chargeback: unpaid lines are cancelled; paid lines get a negative line taken from the next payout
create or replace function public.nl_commission_reverse_payment(p_payment_id uuid, p_reason text)
returns int language plpgsql security definer set search_path = public as $$
declare e record; n int := 0;
begin
  if not private.has_role(auth.uid(), 'admin'::app_role) then raise exception 'Admins only'; end if;
  update nl_commission_client_payments set refunded_at = now(), refund_reason = p_reason where id = p_payment_id and refunded_at is null;
  for e in select * from nl_commission_entries where client_payment_id = p_payment_id and reverses_entry_id is null and amount > 0 loop
    if e.status = 'earned' then
      update nl_commission_entries set status = 'reversed', note = coalesce(p_reason, 'Client payment refunded') where id = e.id;
    elsif e.status = 'paid' and not exists (select 1 from nl_commission_entries r where r.reverses_entry_id = e.id) then
      insert into nl_commission_entries (hire_id, sale_id, client_payment_id, role, rate, base_amount, amount, earned_on, due_on, reverses_entry_id, note)
      values (e.hire_id, e.sale_id, e.client_payment_id, e.role, e.rate, -e.base_amount, -e.amount, current_date, current_date, e.id,
              'Taken back: ' || coalesce(p_reason, 'client payment refunded'));
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Record a wire/ACH the owner sent. Only cleared lines; W-9 must be on file; net must be positive.
create or replace function public.nl_commission_record_payout(p_hire_id uuid, p_entry_ids uuid[], p_method text, p_sent_on date, p_reference text, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare h record; tot numeric; cnt int; pid uuid;
begin
  if not private.has_role(auth.uid(), 'admin'::app_role) then raise exception 'Admins only'; end if;
  select * into h from nl_contractor_hires where id = p_hire_id;
  if h is null then raise exception 'Rep not found'; end if;
  if h.w9_received_at is null then raise exception 'No W-9 on file for this rep yet. No W-9, no payout.'; end if;
  if length(trim(coalesce(p_reference, ''))) < 3 then raise exception 'Enter the wire confirmation or ACH trace number from your bank.'; end if;
  select count(*), coalesce(sum(amount), 0) into cnt, tot from nl_commission_entries
   where id = any(p_entry_ids) and hire_id = p_hire_id and status = 'earned' and payout_id is null and earned_on <= p_sent_on;
  if cnt <> coalesce(array_length(p_entry_ids, 1), 0) then raise exception 'Some lines are already paid, reversed, or their client money has not cleared yet. Refresh and try again.'; end if;
  if tot <= 0 then raise exception 'Nothing to pay: the selected lines add up to $% or less.', tot; end if;
  insert into nl_commission_payouts (hire_id, total, method, sent_on, bank_reference, note, created_by)
  values (p_hire_id, tot, p_method, p_sent_on, trim(p_reference), p_note, auth.uid()) returning id into pid;
  update nl_commission_entries set status = 'paid', payout_id = pid where id = any(p_entry_ids);
  return pid;
end $$;

-- What a rep sees about their own money
create or replace function public.nl_commission_my_ledger()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare h record;
begin
  select * into h from nl_contractor_hires where user_id = auth.uid() order by created_at desc limit 1;
  if h is null then return null; end if;
  return jsonb_build_object(
    'entries', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'client', s.client_name, 'role', e.role, 'rate', e.rate, 'base', e.base_amount,
        'amount', e.amount, 'status', e.status, 'earned_on', e.earned_on, 'due_on', e.due_on, 'note', e.note, 'payout_id', e.payout_id) order by e.earned_on desc, e.created_at desc)
      from nl_commission_entries e join nl_commission_sales s on s.id = e.sale_id where e.hire_id = h.id), '[]'::jsonb),
    'payouts', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'total', p.total, 'method', p.method, 'sent_on', p.sent_on, 'reference', p.bank_reference) order by p.sent_on desc)
      from nl_commission_payouts p where p.hire_id = h.id), '[]'::jsonb));
end $$;

revoke all on function public.nl_commission_reverse_payment(uuid, text) from public, anon;
revoke all on function public.nl_commission_record_payout(uuid, uuid[], text, date, text, text) from public, anon;
revoke all on function public.nl_commission_my_ledger() from public, anon;
revoke all on function public.nl_commission_sync_sale(uuid) from public, anon;
revoke all on function public.nl_commission_make_entries(uuid) from public, anon, authenticated;
grant execute on function public.nl_commission_reverse_payment(uuid, text) to authenticated;
grant execute on function public.nl_commission_record_payout(uuid, uuid[], text, date, text, text) to authenticated;
grant execute on function public.nl_commission_my_ledger() to authenticated;
grant execute on function public.nl_commission_sync_sale(uuid) to authenticated;
grant execute on function public.nl_add_business_days(date, int) to authenticated;

-- Settings: the secure link reps use to send their W-9 and bank details (never into the app)
create table if not exists public.nl_contractor_settings (key text primary key, value text, updated_at timestamptz not null default now());
alter table public.nl_contractor_settings enable row level security;
drop policy if exists "contractor settings read" on public.nl_contractor_settings;
create policy "contractor settings read" on public.nl_contractor_settings for select to authenticated using (true);
drop policy if exists "contractor settings admin" on public.nl_contractor_settings;
create policy "contractor settings admin" on public.nl_contractor_settings for all to authenticated
  using (private.has_role(auth.uid(), 'admin'::app_role)) with check (private.has_role(auth.uid(), 'admin'::app_role));
