-- Full pass: audit log, records that can't be altered, Legal Vault, lead gate, alerts, ending an agreement.

-- ============================================================ 1. Audit log (append-only)
create table if not exists public.nl_contractor_audit (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  action text not null,
  table_name text not null,
  row_id text,
  changes jsonb
);
create index if not exists nl_contractor_audit_row on public.nl_contractor_audit (table_name, row_id);
alter table public.nl_contractor_audit enable row level security;
drop policy if exists "audit admin read" on public.nl_contractor_audit;
create policy "audit admin read" on public.nl_contractor_audit for select to authenticated using (private.has_role(auth.uid(), 'admin'::app_role));

create or replace function public.nl_audit_trg()
returns trigger language plpgsql security definer set search_path = public as $$
declare o jsonb; n jsonb; diff jsonb; rid text;
begin
  o := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) - 'body_md' - 'body_snapshot' end;
  n := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) - 'body_md' - 'body_snapshot' end;
  rid := coalesce(n->>'id', o->>'id', n->>'state_code', o->>'state_code', n->>'key', o->>'key');
  if tg_op = 'UPDATE' then
    select jsonb_object_agg(k, jsonb_build_array(o->k, n->k)) into diff
      from (select jsonb_object_keys(n) k) ks where (o->k) is distinct from (n->k) and k <> 'updated_at';
    if diff is null then return new; end if;
  else
    diff := coalesce(n, o);
  end if;
  insert into nl_contractor_audit (actor, action, table_name, row_id, changes) values (auth.uid(), lower(tg_op), tg_table_name, rid, diff);
  return coalesce(new, old);
end $$;

do $$ declare t text; begin
  foreach t in array array['nl_contractor_hires','nl_contractor_docs','nl_contractor_states','nl_contractor_settings','nl_contractor_signatures',
    'nl_commission_sales','nl_commission_credits','nl_commission_client_payments','nl_commission_entries','nl_commission_payouts'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.nl_audit_trg()', t || '_audit', t);
  end loop;
end $$;

-- ============================================================ 2. Records that can't be altered
create or replace function public.nl_block_change_trg()
returns trigger language plpgsql as $$
begin
  raise exception '% records are permanent and can''t be %d.', tg_argv[0], lower(tg_op);
end $$;

-- Audit log and signed documents: never changed or deleted
drop trigger if exists nl_contractor_audit_lock on public.nl_contractor_audit;
create trigger nl_contractor_audit_lock before update or delete on public.nl_contractor_audit for each row execute function public.nl_block_change_trg('Audit');
drop trigger if exists nl_contractor_signatures_lock on public.nl_contractor_signatures;
create trigger nl_contractor_signatures_lock before update or delete on public.nl_contractor_signatures for each row execute function public.nl_block_change_trg('Signed document');
-- Commission lines and client payments: never deleted (refunds are recorded, not erased)
drop trigger if exists nl_commission_entries_lock on public.nl_commission_entries;
create trigger nl_commission_entries_lock before delete on public.nl_commission_entries for each row execute function public.nl_block_change_trg('Commission');
drop trigger if exists nl_commission_client_payments_lock on public.nl_commission_client_payments;
create trigger nl_commission_client_payments_lock before delete on public.nl_commission_client_payments for each row execute function public.nl_block_change_trg('Client payment');

-- Payouts: never deleted; only the bank-statement match can change afterwards
create or replace function public.nl_payout_guard_trg()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'Payout records are permanent and can''t be deleted.'; end if;
  if (new.hire_id, new.total, new.method, new.sent_on, new.bank_reference) is distinct from (old.hire_id, old.total, old.method, old.sent_on, old.bank_reference) then
    raise exception 'A recorded payout can''t be changed. Record a correction instead.';
  end if;
  return new;
end $$;
drop trigger if exists nl_commission_payouts_lock on public.nl_commission_payouts;
create trigger nl_commission_payouts_lock before update or delete on public.nl_commission_payouts for each row execute function public.nl_payout_guard_trg();

-- Sales and credits: can't be deleted once any commission exists for them
create or replace function public.nl_sale_delete_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from nl_commission_entries e where e.sale_id = old.id) then
    raise exception 'This sale has commission records, so it can''t be deleted.';
  end if;
  return old;
end $$;
create or replace function public.nl_credit_delete_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from nl_commission_entries e where e.sale_id = old.sale_id and e.hire_id = old.hire_id and e.role = old.role) then
    raise exception 'Commission was already recorded for this credit, so it can''t be removed.';
  end if;
  return old;
end $$;
drop trigger if exists nl_commission_sales_lock on public.nl_commission_sales;
create trigger nl_commission_sales_lock before delete on public.nl_commission_sales for each row execute function public.nl_sale_delete_guard();
drop trigger if exists nl_commission_credits_lock on public.nl_commission_credits;
create trigger nl_commission_credits_lock before delete on public.nl_commission_credits for each row execute function public.nl_credit_delete_guard();

-- Contractors: can't be deleted once they've signed anything or been credited
create or replace function public.nl_hire_delete_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from nl_contractor_signatures where hire_id = old.id) or exists (select 1 from nl_commission_credits where hire_id = old.id) then
    raise exception 'This contractor has signed records, so they can''t be deleted. End the agreement instead.';
  end if;
  return old;
end $$;
drop trigger if exists nl_contractor_hires_lock on public.nl_contractor_hires;
create trigger nl_contractor_hires_lock before delete on public.nl_contractor_hires for each row execute function public.nl_hire_delete_guard();

-- Documents: a version someone signed can't be edited or deleted (edits make a new version)
create or replace function public.nl_doc_guard_trg()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from nl_contractor_signatures where doc_id = old.id) then
    if tg_op = 'DELETE' then raise exception 'Someone signed this version, so it can''t be deleted.'; end if;
    if new.body_md is distinct from old.body_md or new.title is distinct from old.title or new.version is distinct from old.version or new.slug is distinct from old.slug then
      raise exception 'Someone signed this version, so its text can''t change. Save a new version instead.';
    end if;
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists nl_contractor_docs_lock on public.nl_contractor_docs;
create trigger nl_contractor_docs_lock before update or delete on public.nl_contractor_docs for each row execute function public.nl_doc_guard_trg();

-- ============================================================ 3. Legal Vault: company documents
create table if not exists public.nl_legal_documents (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('formation','state_filing','tax','insurance','attorney','agreement_template','other')),
  title text not null,
  doc_date date,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  sha256 text,
  notes text,
  legal_hold boolean not null default false,
  archived_at timestamptz,
  uploaded_by uuid,
  uploaded_at timestamptz not null default now()
);
alter table public.nl_legal_documents enable row level security;
drop policy if exists "legal docs admin" on public.nl_legal_documents;
create policy "legal docs admin" on public.nl_legal_documents for all to authenticated
  using (private.has_role(auth.uid(), 'admin'::app_role)) with check (private.has_role(auth.uid(), 'admin'::app_role));
drop trigger if exists nl_legal_documents_audit on public.nl_legal_documents;
create trigger nl_legal_documents_audit after insert or update or delete on public.nl_legal_documents for each row execute function public.nl_audit_trg();

create or replace function public.nl_legal_hold_on()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select value = 'on' from nl_contractor_settings where key = 'legal_hold'), false)
$$;

-- Company documents: deletable only within 24 hours of upload (to fix a mistake) and never under a hold; otherwise archive.
create or replace function public.nl_legal_doc_guard_trg()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if old.legal_hold or nl_legal_hold_on() then raise exception 'This document is under a legal hold and can''t be deleted.'; end if;
    if old.uploaded_at < now() - interval '24 hours' then raise exception 'Documents can only be deleted within 24 hours of upload. Archive it instead.'; end if;
    return old;
  end if;
  if (new.storage_path, new.sha256, new.file_name) is distinct from (old.storage_path, old.sha256, old.file_name) then
    raise exception 'A stored file can''t be swapped. Upload a new document instead.';
  end if;
  return new;
end $$;
drop trigger if exists nl_legal_documents_lock on public.nl_legal_documents;
create trigger nl_legal_documents_lock before update or delete on public.nl_legal_documents for each row execute function public.nl_legal_doc_guard_trg();

insert into storage.buckets (id, name, public) values ('legal-vault', 'legal-vault', false) on conflict (id) do nothing;
drop policy if exists "legal vault admin read" on storage.objects;
create policy "legal vault admin read" on storage.objects for select to authenticated
  using (bucket_id = 'legal-vault' and private.has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "legal vault admin upload" on storage.objects;
create policy "legal vault admin upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'legal-vault' and private.has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "legal vault admin delete" on storage.objects;
create policy "legal vault admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'legal-vault' and private.has_role(auth.uid(), 'admin'::app_role)
         and not public.nl_legal_hold_on()
         and exists (select 1 from public.nl_legal_documents d where d.storage_path = storage.objects.name
                     and not d.legal_hold and d.uploaded_at > now() - interval '24 hours')
         or (bucket_id = 'legal-vault' and private.has_role(auth.uid(), 'admin'::app_role)
             and not exists (select 1 from public.nl_legal_documents d where d.storage_path = storage.objects.name)));

-- ============================================================ 4. Legal Vault index
-- Rep records are kept 6 years after the later of: last payout, agreement end, last signature.
create or replace function public.nl_contractor_retain_until(p_hire_id uuid)
returns date language sql stable security definer set search_path = public as $$
  select (greatest(
            coalesce((select max(sent_on) from nl_commission_payouts where hire_id = p_hire_id), '1900-01-01'::date),
            coalesce((select ended_at::date from nl_contractor_hires where id = p_hire_id), current_date),
            coalesce((select max(signed_at)::date from nl_contractor_signatures where hire_id = p_hire_id), '1900-01-01'::date)
          ) + interval '6 years')::date
$$;

create or replace function public.nl_legal_vault_index()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not private.has_role(auth.uid(), 'admin'::app_role) then raise exception 'Admins only'; end if;
  return coalesce((select jsonb_agg(r order by r->>'date' desc) from (
    -- documents reps signed
    select jsonb_build_object('kind', 'rep_document', 'id', g.id, 'title', g.doc_title || ' (v' || g.doc_version || ')',
      'person', h.full_name, 'hire_id', h.id, 'date', g.signed_at, 'retain_until', nl_contractor_retain_until(h.id),
      'detail', 'Signed by ' || g.typed_name || coalesce(' · IP ' || g.ip, '')) r
      from nl_contractor_signatures g join nl_contractor_hires h on h.id = g.hire_id
    union all
    -- company countersignatures
    select jsonb_build_object('kind', 'countersignature', 'id', h.id, 'title', 'Company countersignature', 'person', h.full_name, 'hire_id', h.id,
      'date', h.countersigned_at, 'retain_until', nl_contractor_retain_until(h.id), 'detail', 'Countersigned by ' || h.countersign_name)
      from nl_contractor_hires h where h.countersigned_at is not null
    union all
    -- state new-hire reports
    select jsonb_build_object('kind', 'state_report', 'id', h.id, 'title', 'State contractor report (' || h.state_code || ')', 'person', h.full_name, 'hire_id', h.id,
      'date', h.state_report_filed_at, 'retain_until', nl_contractor_retain_until(h.id), 'detail', coalesce('Confirmation ' || h.state_report_confirmation, 'No confirmation number'))
      from nl_contractor_hires h where h.state_report_filed_at is not null
    union all
    -- W-9 / TIN check records (status only; the W-9 itself lives in TaxBandits)
    select jsonb_build_object('kind', 'w9', 'id', h.id, 'title', 'W-9 received' || case when h.tin_matched_at is not null then ' · TIN verified' else '' end,
      'person', h.full_name, 'hire_id', h.id, 'date', h.w9_received_at, 'retain_until', nl_contractor_retain_until(h.id), 'detail', 'Form held in TaxBandits')
      from nl_contractor_hires h where h.w9_received_at is not null
    union all
    -- commission payouts (statements)
    select jsonb_build_object('kind', 'payout', 'id', p.id, 'title', 'Commission payout $' || to_char(p.total, 'FM999,999,990.00'), 'person', h.full_name, 'hire_id', h.id,
      'date', p.sent_on, 'retain_until', nl_contractor_retain_until(h.id), 'detail', upper(p.method) || ' · ' || p.bank_reference || case when p.reconciled_at is not null then ' · matched to bank' else '' end)
      from nl_commission_payouts p join nl_contractor_hires h on h.id = p.hire_id
    union all
    -- client service agreements signed through Pay & Sign
    select jsonb_build_object('kind', 'client_agreement', 'id', e.id, 'title', coalesce(e.title, 'Service agreement'), 'person', coalesce(e.recipient_name, e.recipient_email),
      'deal_id', case when e.related_type = 'crm_deal' then e.related_id end, 'date', e.completed_at, 'retain_until', (e.completed_at::date + interval '6 years')::date,
      'detail', 'Terms ' || coalesce(e.terms_version, '—'))
      from document_envelopes e where e.status::text = 'completed'
    union all
    -- company documents
    select jsonb_build_object('kind', 'company_document', 'id', d.id, 'title', d.title, 'person', 'Vivid Virtual Creations LLC', 'category', d.category,
      'date', coalesce(d.doc_date::timestamptz, d.uploaded_at), 'retain_until', null, 'hold', d.legal_hold, 'archived', d.archived_at is not null,
      'path', d.storage_path, 'detail', d.file_name)
      from nl_legal_documents d
  ) x(r)), '[]'::jsonb);
end $$;

-- ============================================================ 5. Lead gate: no leads or phone numbers until the paperwork is signed
create or replace function public.nl_contractor_sell_block_reason(p_uid uuid)
returns text language plpgsql stable security definer set search_path = public as $$
declare h public.nl_contractor_hires; em text; missing int;
begin
  if p_uid is null then return null; end if;
  select lower(email) into em from auth.users where id = p_uid;
  select * into h from nl_contractor_hires where user_id = p_uid or (user_id is null and lower(email) = em) order by created_at desc limit 1;
  if h.id is null then return null; end if;              -- not a contractor (owner, staff)
  if h.status = 'ended' then return 'Your agreement with NewLight has ended.'; end if;
  if h.mailing_address is null then return 'Finish My Paperwork & Pay first: add your details and sign your documents.'; end if;
  select count(*) into missing from nl_contractor_docs d
   where d.active and not d.after_countersign
     and d.version = (select max(version) from nl_contractor_docs x where x.slug = d.slug and x.active)
     and nl_contractor_doc_applies(d, h)
     and not exists (select 1 from nl_contractor_signatures g where g.hire_id = h.id and g.doc_slug = d.slug
                     and (d.renew_months is null or g.signed_at > now() - make_interval(months => d.renew_months)));
  if missing > 0 then return 'Sign your documents in My Paperwork & Pay before calling (' || missing || ' left).'; end if;
  return null;
end $$;

create or replace function public.nl_contractor_my_sell_status()
returns text language sql stable security definer set search_path = public as $$
  select nl_contractor_sell_block_reason(auth.uid())
$$;

create or replace function public.nl_contractor_assert_can_sell(p_uid uuid)
returns void language plpgsql stable security definer set search_path = public as $$
declare why text;
begin
  why := nl_contractor_sell_block_reason(p_uid);
  if why is not null then raise exception '%', why; end if;
end $$;

revoke all on function public.nl_contractor_sell_block_reason(uuid) from public, anon, authenticated;
revoke all on function public.nl_contractor_my_sell_status() from public, anon;
revoke all on function public.nl_contractor_assert_can_sell(uuid) from public, anon, authenticated;
revoke all on function public.nl_legal_vault_index() from public, anon;
revoke all on function public.nl_contractor_retain_until(uuid) from public, anon, authenticated;
grant execute on function public.nl_contractor_my_sell_status() to authenticated;
grant execute on function public.nl_legal_vault_index() to authenticated;

-- Patch the two lead RPCs (pulling leads, loading phone numbers) to check the gate first.
do $$ declare def text; begin
  select pg_get_functiondef('public.nl_pool_pull(text,text,text,integer)'::regprocedure) into def;
  if position('nl_contractor_assert_can_sell' in def) = 0 then
    def := replace(def, 'if me is null then raise exception ''Not signed in''; end if;',
                        'if me is null then raise exception ''Not signed in''; end if;' || chr(10) || '  perform public.nl_contractor_assert_can_sell(me);');
    if position('nl_contractor_assert_can_sell' in def) = 0 then raise exception 'nl_pool_pull patch point not found'; end if;
    execute def;
  end if;
  select pg_get_functiondef('public.nl_dialer_lead_details(uuid[])'::regprocedure) into def;
  if position('nl_contractor_assert_can_sell' in def) = 0 then
    def := replace(def, 'if _uid is null then raise exception ''Not signed in''; end if;',
                        'if _uid is null then raise exception ''Not signed in''; end if;' || chr(10) || '  perform public.nl_contractor_assert_can_sell(_uid);');
    if position('nl_contractor_assert_can_sell' in def) = 0 then raise exception 'nl_dialer_lead_details patch point not found'; end if;
    execute def;
  end if;
end $$;

-- ============================================================ 6. Alerts (shown on the admin pages; daily copy into Notifications)
create or replace function public.nl_contractor_alerts()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare today date := (now() at time zone 'America/Los_Angeles')::date;
begin
  if auth.uid() is not null and not private.has_role(auth.uid(), 'admin'::app_role) then raise exception 'Admins only'; end if;
  return coalesce((select jsonb_agg(a order by (a->>'rank')::int, a->>'title') from (
    -- commissions owed (client money has cleared): send within 3 business days; late after that
    select jsonb_build_object('key', 'payout:' || h.id || ':' || min(e.due_on) filter (where e.amount > 0), 'rank', case when min(e.due_on) filter (where e.amount > 0) < today then 1 else 2 end,
      'level', case when min(e.due_on) filter (where e.amount > 0) < today then 'urgent' else 'soon' end,
      'title', case when min(e.due_on) filter (where e.amount > 0) < today then 'Commission is late: ' else 'Commission ready to send: ' end || h.full_name,
      'detail', '$' || to_char(sum(e.amount), 'FM999,999,990.00') || ' due by ' || to_char(min(e.due_on) filter (where e.amount > 0), 'FMMon FMDD') ||
                case when h.w9_received_at is null then '. No W-9 on file yet: get it before you pay.' else '.' end,
      'link', '/admin/commissions') a
      from nl_commission_entries e join nl_contractor_hires h on h.id = e.hire_id
     where e.status = 'earned' and e.payout_id is null and e.earned_on <= today
     group by h.id, h.full_name, h.w9_received_at
    having sum(e.amount) > 0
    union all
    -- state new-hire report due within 5 days or late
    select jsonb_build_object('key', 'state_report:' || h.id, 'rank', case when due < today then 1 else 3 end,
      'level', case when due < today then 'urgent' else 'soon' end,
      'title', 'State contractor report ' || case when due < today then 'late: ' else 'due: ' end || h.full_name,
      'detail', s.state_name || ' report due ' || to_char(due, 'FMMon FMDD') || '.', 'link', '/admin/contractors')
      from (select h.*, (coalesce(h.countersigned_at, (select min(signed_at) from nl_contractor_signatures g where g.hire_id = h.id), h.created_at)::date
                         + s2.report_days) due
              from nl_contractor_hires h join nl_contractor_states s2 on s2.state_code = h.state_code
             where s2.report_days is not null and h.state_report_filed_at is null and h.status <> 'ended'
               and exists (select 1 from nl_contractor_signatures g where g.hire_id = h.id)) h
      join nl_contractor_states s on s.state_code = h.state_code
     where due <= today + 5
    union all
    -- waiting on your countersignature
    select jsonb_build_object('key', 'countersign:' || h.id, 'rank', 3, 'level', 'soon', 'title', 'Countersign: ' || h.full_name,
      'detail', 'They signed their agreement. Countersign so they get the fully signed copy.', 'link', '/admin/contractors')
      from nl_contractor_hires h
     where h.status <> 'ended' and h.countersigned_at is null
       and exists (select 1 from nl_contractor_signatures g where g.hire_id = h.id and g.doc_slug = 'contractor-agreement')
    union all
    -- W-9 received but tax ID not verified
    select jsonb_build_object('key', 'tin:' || h.id, 'rank', 4, 'level', 'soon', 'title', 'Verify tax ID: ' || h.full_name,
      'detail', 'W-9 is in. Run the TIN match in TaxBandits before the first payment.', 'link', '/admin/contractors')
      from nl_contractor_hires h where h.status <> 'ended' and h.w9_received_at is not null and h.tin_matched_at is null
    union all
    -- yearly conduct acknowledgment expiring within 30 days (or expired)
    select jsonb_build_object('key', 'ack:' || h.id || ':' || to_char(last_ack, 'YYYYMMDD'), 'rank', 5, 'level', 'info',
      'title', 'Yearly re-signing ' || case when last_ack + interval '12 months' < now() then 'overdue: ' else 'coming up: ' end || h.full_name,
      'detail', 'Their Sales Conduct acknowledgment ' || case when last_ack + interval '12 months' < now() then 'expired' else 'expires' end || ' ' ||
                to_char(last_ack + interval '12 months', 'FMMon FMDD') || '. The app asks them to re-sign automatically.', 'link', '/admin/contractors')
      from (select h.*, (select max(signed_at) from nl_contractor_signatures g where g.hire_id = h.id and g.doc_slug = 'conduct-acknowledgment') last_ack
              from nl_contractor_hires h where h.status <> 'ended') h
     where last_ack is not null and last_ack + interval '11 months' < now()
  ) x(a)), '[]'::jsonb);
end $$;
revoke all on function public.nl_contractor_alerts() from public, anon;
grant execute on function public.nl_contractor_alerts() to authenticated;

-- Daily: copy new alerts into the NewLight workspace's Notifications (once per alert)
create or replace function public.nl_contractor_alerts_notify()
returns int language plpgsql security definer set search_path = public as $$
declare a jsonb; n int := 0;
begin
  for a in select * from jsonb_array_elements(nl_contractor_alerts()) loop
    if not exists (select 1 from notifications where linked_type = 'contractor_alert' and linked_id = a->>'key' and created_at > now() - interval '3 days') then
      insert into notifications (client_id, recipient_user_id, type, title, message, linked_type, linked_id, is_read)
      values ('00000000-0000-0000-0000-0000000000ff', null, case when a->>'level' = 'urgent' then 'alert' else 'info' end,
              a->>'title', a->>'detail', 'contractor_alert', a->>'key', false);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;
revoke all on function public.nl_contractor_alerts_notify() from public, anon, authenticated;

select cron.unschedule('nl-contractor-alerts-daily') where exists (select 1 from cron.job where jobname = 'nl-contractor-alerts-daily');
select cron.schedule('nl-contractor-alerts-daily', '23 15 * * *', $$select public.nl_contractor_alerts_notify()$$);

-- ============================================================ 7. Ending an agreement
create or replace function public.nl_contractor_end(p_hire_id uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare h public.nl_contractor_hires;
begin
  if not private.has_role(auth.uid(), 'admin'::app_role) then raise exception 'Admins only'; end if;
  select * into h from nl_contractor_hires where id = p_hire_id;
  if h.id is null then raise exception 'Contractor not found'; end if;
  if h.status = 'ended' then return h.user_id; end if;
  update nl_contractor_hires set status = 'ended', ended_at = now(), updated_at = now(),
    offboarding = coalesce(offboarding, '{}'::jsonb) || jsonb_build_object('reason', nullif(trim(coalesce(p_reason, '')), ''), 'territories_closed', now())
  where id = h.id;
  if h.user_id is not null then
    update nl_lead_territories set active = false where rep_user_id = h.user_id and active;
  end if;
  return h.user_id;
end $$;
revoke all on function public.nl_contractor_end(uuid, text) from public, anon;
grant execute on function public.nl_contractor_end(uuid, text) to authenticated;

-- ============================================================ 8. Rep lookup used by every rep action (links the account by email the first time)
create or replace function public.nl_contractor_my_hire_id()
returns uuid language plpgsql security definer set search_path = public as $$
declare hid uuid; em text;
begin
  if auth.uid() is null then return null; end if;
  select id into hid from nl_contractor_hires where user_id = auth.uid() and status <> 'ended' order by created_at desc limit 1;
  if hid is null then
    select lower(email) into em from auth.users where id = auth.uid();
    select id into hid from nl_contractor_hires where lower(email) = em and status <> 'ended' and user_id is null order by created_at desc limit 1;
    if hid is not null then update nl_contractor_hires set user_id = auth.uid(), updated_at = now() where id = hid; end if;
  end if;
  return hid;
end $$;
revoke all on function public.nl_contractor_my_hire_id() from public, anon, authenticated;

create or replace function public.nl_contractor_set_profile(p_address text, p_phone text, p_city text, p_entity text, p_business text)
returns void language plpgsql security definer set search_path = public as $$
declare hid uuid := nl_contractor_my_hire_id();
begin
  if hid is null then raise exception 'No paperwork found for your account.'; end if;
  if length(trim(coalesce(p_address, ''))) < 8 then raise exception 'Enter your full mailing address.'; end if;
  if length(trim(coalesce(p_city, ''))) < 2 then raise exception 'Enter the city you work from.'; end if;
  update nl_contractor_hires set mailing_address = trim(p_address), phone = nullif(trim(p_phone), ''), work_city = initcap(trim(p_city)),
    entity_type = nullif(trim(p_entity), ''), business_name = coalesce(nullif(trim(p_business), ''), business_name), updated_at = now()
  where id = hid;
  perform nl_contractor_refresh_status(hid);
end $$;

create or replace function public.nl_contractor_sign(p_doc_id uuid, p_typed_name text, p_consent boolean, p_body_sha256 text, p_user_agent text)
returns uuid language plpgsql security definer set search_path = public as $$
declare h public.nl_contractor_hires; d public.nl_contractor_docs; body text; sha text; sid uuid; ip text; hid uuid := nl_contractor_my_hire_id();
begin
  if not coalesce(p_consent, false) then raise exception 'Please agree to sign electronically first.'; end if;
  if length(trim(coalesce(p_typed_name, ''))) < 3 then raise exception 'Type your full legal name to sign.'; end if;
  select * into h from nl_contractor_hires where id = hid;
  if h.id is null then raise exception 'No paperwork found for your account.'; end if;
  if h.mailing_address is null then raise exception 'Add your mailing address first (step 1).'; end if;
  select * into d from nl_contractor_docs where id = p_doc_id and active
    and version = (select max(version) from nl_contractor_docs x where x.slug = nl_contractor_docs.slug and x.active);
  if d.id is null or not nl_contractor_doc_applies(d, h) then raise exception 'That document is no longer current. Refresh the page.'; end if;
  body := nl_contractor_render(h.id, d.id);
  sha := encode(extensions.digest(body, 'sha256'), 'hex');
  if sha <> p_body_sha256 then raise exception 'The document changed since you opened it. Refresh the page and read it again.'; end if;
  begin
    ip := split_part(coalesce((current_setting('request.headers', true)::json)->>'x-forwarded-for', ''), ',', 1);
  exception when others then ip := null; end;
  insert into nl_contractor_signatures (hire_id, user_id, doc_id, doc_slug, doc_version, doc_title, body_snapshot, body_sha256, typed_name, esign_consent, ip, user_agent)
  values (h.id, auth.uid(), d.id, d.slug, d.version, d.title, body, sha, trim(p_typed_name), true, nullif(trim(ip), ''), left(p_user_agent, 400))
  returning id into sid;
  perform nl_contractor_refresh_status(h.id);
  return sid;
end $$;

-- ============================================================ 9. Does this email already have an account? (so adding a rep never touches an existing account's roles)
create or replace function public.nl_contractor_email_status(p_email text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid; roles text[];
begin
  if not private.has_role(auth.uid(), 'admin'::app_role) then raise exception 'Admins only'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if uid is null then return jsonb_build_object('has_account', false); end if;
  select array_agg(distinct role::text) into roles from user_roles where user_id = uid;
  return jsonb_build_object('has_account', true, 'user_id', uid, 'roles', coalesce(roles, '{}'));
end $$;
revoke all on function public.nl_contractor_email_status(text) from public, anon;
grant execute on function public.nl_contractor_email_status(text) to authenticated;

-- ============================================================ 10. Agreement v2 closing line now matches the countersign step (no one had signed v2 yet)
update public.nl_contractor_docs set body_md = replace(body_md, '*The Company signs this agreement by offering it to the Contractor in the Company''s app. The Contractor signs below by typing their full legal name.*', '*The Contractor signs below by typing their full legal name. The Company then countersigns in its app, and the Contractor can download the fully signed copy at any time.*')
where slug = 'contractor-agreement' and version = 2 and not exists (select 1 from public.nl_contractor_signatures where doc_slug = 'contractor-agreement');
