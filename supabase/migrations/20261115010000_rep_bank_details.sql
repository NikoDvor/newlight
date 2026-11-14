-- Rep payout bank details, collected in the app. Full numbers live encrypted in Supabase Vault;
-- the table only holds what's safe to show (names, last 4). Admin reveals are logged.
create table if not exists public.nl_rep_bank (
  hire_id uuid primary key references public.nl_contractor_hires(id) on delete cascade,
  user_id uuid not null,
  account_holder text not null,
  bank_name text not null,
  account_type text not null check (account_type in ('checking','savings')),
  routing_last4 text not null,
  account_last4 text not null,
  secret_id uuid not null,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.nl_rep_bank_access_log (
  id uuid primary key default gen_random_uuid(),
  hire_id uuid not null,
  admin_id uuid not null,
  action text not null default 'reveal',
  at timestamptz not null default now()
);
alter table public.nl_rep_bank enable row level security;
alter table public.nl_rep_bank_access_log enable row level security;
drop policy if exists "rep bank self read" on public.nl_rep_bank;
create policy "rep bank self read" on public.nl_rep_bank for select to authenticated using (user_id = auth.uid());
drop policy if exists "rep bank admin read" on public.nl_rep_bank;
create policy "rep bank admin read" on public.nl_rep_bank for select to authenticated using (private.is_admin_or_operator(auth.uid()));
drop policy if exists "rep bank log admin read" on public.nl_rep_bank_access_log;
create policy "rep bank log admin read" on public.nl_rep_bank_access_log for select to authenticated using (private.has_role(auth.uid(), 'admin'::app_role));
revoke insert, update, delete on public.nl_rep_bank, public.nl_rep_bank_access_log from anon, authenticated;

create or replace function public.nl_rep_bank_save(p_holder text, p_bank text, p_type text, p_routing text, p_account text)
returns void language plpgsql security definer set search_path = public, vault as $$
declare hid uuid := nl_contractor_my_hire_id(); r text := regexp_replace(coalesce(p_routing,''), '\D', '', 'g'); a text := regexp_replace(coalesce(p_account,''), '\D', '', 'g');
  sid uuid; payload text; d int[];
begin
  if hid is null then raise exception 'No paperwork found for your account.'; end if;
  if length(trim(coalesce(p_holder,''))) < 3 then raise exception 'Enter the name on the account.'; end if;
  if length(trim(coalesce(p_bank,''))) < 2 then raise exception 'Enter the bank name.'; end if;
  if p_type not in ('checking','savings') then raise exception 'Choose checking or savings.'; end if;
  if length(r) <> 9 then raise exception 'A routing number is 9 digits.'; end if;
  d := array(select substr(r, i, 1)::int from generate_series(1, 9) i);
  if (3*(d[1]+d[4]+d[7]) + 7*(d[2]+d[5]+d[8]) + (d[3]+d[6]+d[9])) % 10 <> 0 then raise exception 'That routing number isn''t valid. Check it and try again.'; end if;
  if length(a) < 4 or length(a) > 17 then raise exception 'An account number is 4 to 17 digits.'; end if;
  payload := jsonb_build_object('routing', r, 'account', a)::text;
  select secret_id into sid from nl_rep_bank where hire_id = hid;
  if sid is null then
    sid := vault.create_secret(payload, 'rep_bank_' || hid::text, 'Rep payout bank details');
  else
    perform vault.update_secret(sid, payload, 'rep_bank_' || hid::text, 'Rep payout bank details');
  end if;
  insert into nl_rep_bank (hire_id, user_id, account_holder, bank_name, account_type, routing_last4, account_last4, secret_id)
  values (hid, auth.uid(), trim(p_holder), trim(p_bank), p_type, right(r, 4), right(a, 4), sid)
  on conflict (hire_id) do update set account_holder = excluded.account_holder, bank_name = excluded.bank_name, account_type = excluded.account_type,
    routing_last4 = excluded.routing_last4, account_last4 = excluded.account_last4, secret_id = excluded.secret_id, updated_at = now();
end $$;
revoke all on function public.nl_rep_bank_save(text,text,text,text,text) from public, anon;
grant execute on function public.nl_rep_bank_save(text,text,text,text,text) to authenticated;

-- Admin only (not operators): decrypt and log.
create or replace function public.nl_rep_bank_reveal(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public, vault as $$
declare b nl_rep_bank; s text;
begin
  if not private.has_role(auth.uid(), 'admin'::app_role) then raise exception 'Admins only'; end if;
  select * into b from nl_rep_bank where user_id = p_user;
  if b.hire_id is null then return null; end if;
  select decrypted_secret into s from vault.decrypted_secrets where id = b.secret_id;
  insert into nl_rep_bank_access_log (hire_id, admin_id) values (b.hire_id, auth.uid());
  return jsonb_build_object('account_holder', b.account_holder, 'bank_name', b.bank_name, 'account_type', b.account_type,
    'routing', (s::jsonb)->>'routing', 'account', (s::jsonb)->>'account', 'submitted_at', b.submitted_at);
end $$;
revoke all on function public.nl_rep_bank_reveal(uuid) from public, anon;
grant execute on function public.nl_rep_bank_reveal(uuid) to authenticated;
