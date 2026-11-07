-- Service-role-only: reverse rep commission for a refunded/disputed client payment (called by stripe-webhook).
create or replace function public.nl_commission_reverse_for_schedule(p_schedule_id uuid, p_reason text) returns integer
language plpgsql security definer set search_path=public as $$
declare pid uuid; e record; n int := 0;
begin
  select id into pid from nl_commission_client_payments where billing_schedule_id = p_schedule_id and refunded_at is null;
  if pid is null then return 0; end if;
  update nl_commission_client_payments set refunded_at = now(), refund_reason = p_reason where id = pid;
  for e in select * from nl_commission_entries where client_payment_id = pid and reverses_entry_id is null and amount > 0 loop
    if e.status = 'earned' then
      update nl_commission_entries set status = 'reversed', note = coalesce(p_reason, 'Client payment refunded') where id = e.id;
    elsif e.status = 'paid' and not exists (select 1 from nl_commission_entries r where r.reverses_entry_id = e.id) then
      insert into nl_commission_entries (hire_id, sale_id, client_payment_id, role, rate, base_amount, amount, earned_on, due_on, reverses_entry_id, note)
      values (e.hire_id, e.sale_id, e.client_payment_id, e.role, e.rate, -e.base_amount, -e.amount, current_date, current_date, e.id, 'Taken back: ' || coalesce(p_reason, 'client payment refunded'));
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.nl_commission_reverse_for_schedule(uuid, text) from public, anon, authenticated;
grant execute on function public.nl_commission_reverse_for_schedule(uuid, text) to service_role;
