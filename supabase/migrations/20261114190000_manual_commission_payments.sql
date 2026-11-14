-- Nov 14, 2026: commissions are manual payments. No preset rates; the owner records what was sent.
alter table public.nl_commission_payouts alter column hire_id drop not null;
alter table public.nl_commission_payouts add column if not exists payee_name text;
alter table public.nl_commission_payouts drop constraint if exists nl_commission_payouts_method_check;
alter table public.nl_commission_payouts add constraint nl_commission_payouts_method_check check (method in ('wire','ach','check','zelle','cash','other'));

do $$ declare d text; begin
  select pg_get_functiondef('public.nl_commission_my_ledger'::regproc) into d;
  d := replace(d, '''reference'', p.bank_reference)', '''reference'', p.bank_reference, ''note'', p.note)');
  execute d;
end $$;
