-- Nov 14, 2026: admin <-> salesman alignment.

-- 1) Salesmen with no contractor record (they bypass the paperwork gate and can't be paid commission).
create or replace function public.nl_unlinked_salesmen()
returns table (user_id uuid, full_name text, email text) language sql stable security definer set search_path = public as $$
  select ur.user_id, ep.full_name, coalesce(ep.email, u.email)
  from user_roles ur
  join auth.users u on u.id = ur.user_id
  left join employee_profiles ep on ep.user_id = ur.user_id
  where ur.role = 'marketing_staff'
    and private.is_admin_or_operator(auth.uid())
    and not exists (select 1 from nl_contractor_hires h where h.user_id = ur.user_id or lower(h.email) = lower(u.email))
  order by 2;
$$;
revoke all on function public.nl_unlinked_salesmen() from public, anon;
grant execute on function public.nl_unlinked_salesmen() to authenticated;

-- 2) Lead assignment: only to real salesmen, never skip the paperwork gate, never hand out do-not-call numbers.
do $$ declare d text; begin
  select pg_get_functiondef('public.nl_pool_claim_for(uuid,text,text,text,integer)'::regprocedure) into d;
  d := replace(d, E'  if _count is null or _count < 1 then return 0; end if;',
    E'  if not exists (select 1 from public.user_roles ur where ur.user_id = _rep and ur.role = ''marketing_staff'') then raise exception ''That user is not a salesman''; end if;\n  if _count is null or _count < 1 then return 0; end if;');
  d := replace(d, E'where p.status = ''available''\n',
    E'where p.status = ''available''\n      and not exists (select 1 from public.nl_dnc_numbers dn where dn.phone_normalized = public.nl_phone10(p.main_phone))\n');
  d := replace(d, 'where c.firm_id = f.id and not c.do_not_call order by',
    'where c.firm_id = f.id and not c.do_not_call and not exists (select 1 from public.nl_dnc_numbers dn where dn.phone_normalized in (public.nl_phone10(c.mobile_phone), public.nl_phone10(c.landline_phone), public.nl_phone10(c.phone))) order by');
  execute d;
end $$;

create or replace function public.nl_pool_assign(_rep uuid, _state text, _city text default null, _firm_type text default 'any', _count integer default 50)
returns integer language plpgsql security definer set search_path = public as $$
declare why text;
begin
  if not private.is_admin_or_operator(auth.uid()) then raise exception 'Admins only'; end if;
  why := public.nl_contractor_sell_block_reason(_rep);
  if why is not null then raise exception 'Can''t assign leads to this rep yet: %', why; end if;
  return public.nl_pool_claim_for(_rep, _state, _city, _firm_type, _count);
end $$;

-- 3) Offboarding / account deletion: release untouched pool leads, hand everything else to an admin.
create or replace function public.nl_release_rep_assets(p_rep uuid, p_to uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare released int := 0; moved int := 0; deals int := 0; firms int := 0; ids uuid[];
begin
  select coalesce(array_agg(id), '{}') into ids from nl_bdr_leads
   where user_id = p_rep and pool_firm_id is not null and coalesce(called, false) = false
     and crm_deal_id is null and callback_at is null and coalesce(pipeline_stage, 'cold') = 'cold';
  if array_length(ids, 1) > 0 then
    update nl_lead_pool_firms set status = 'available', owner_rep_id = null, lead_id = null, claimed_at = null,
           previous_owner_ids = case when p_rep = any(previous_owner_ids) then previous_owner_ids else previous_owner_ids || p_rep end, updated_at = now()
     where lead_id = any(ids);
    get diagnostics released = row_count;
    delete from nl_bdr_leads where id = any(ids);
  end if;
  if p_to is not null then
    update crm_deals set assigned_user = p_to where assigned_user = p_rep and client_id = '00000000-0000-0000-0000-0000000000ff';
    get diagnostics deals = row_count;
    update nl_lead_pool_firms set owner_rep_id = p_to where owner_rep_id = p_rep;
    get diagnostics firms = row_count;
    update nl_bdr_leads set user_id = p_to where user_id = p_rep;
    get diagnostics moved = row_count;
  end if;
  return jsonb_build_object('released_to_pool', released, 'leads_reassigned', moved, 'deals_reassigned', deals, 'firms_reassigned', firms,
    'leads_left', (select count(*) from nl_bdr_leads where user_id = p_rep));
end $$;
revoke all on function public.nl_release_rep_assets(uuid, uuid) from public, anon, authenticated;
grant execute on function public.nl_release_rep_assets(uuid, uuid) to service_role;

create or replace function public.nl_contractor_offboard_assets(p_hire_id uuid, p_reassign_to uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare h nl_contractor_hires; r jsonb;
begin
  if not private.is_admin_or_operator(auth.uid()) then raise exception 'Admins only'; end if;
  select * into h from nl_contractor_hires where id = p_hire_id;
  if h.id is null or h.user_id is null then raise exception 'No login to clean up for this contractor'; end if;
  if p_reassign_to is not null and not private.is_admin_or_operator(p_reassign_to) then raise exception 'Reassign to an admin or operator'; end if;
  r := public.nl_release_rep_assets(h.user_id, p_reassign_to);
  update nl_contractor_hires set offboarding = coalesce(offboarding, '{}'::jsonb) || jsonb_build_object('assets', r, 'assets_at', now()) where id = p_hire_id;
  return r;
end $$;
revoke all on function public.nl_contractor_offboard_assets(uuid, uuid) from public, anon;
grant execute on function public.nl_contractor_offboard_assets(uuid, uuid) to authenticated;

-- 4) A rep can't delete a lead whose deal has a contract, a payment or a client. Admins still can.
create or replace function public.nl_bdr_lead_delete_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare d record;
begin
  if old.crm_deal_id is null or auth.uid() is null or private.is_admin_or_operator(auth.uid()) then return old; end if;
  select pay_sign_status, service_agreement_envelope_id, provisioned_client_id into d from crm_deals where id = old.crm_deal_id;
  if found and (d.provisioned_client_id is not null or d.service_agreement_envelope_id is not null
      or lower(coalesce(d.pay_sign_status, '')) in ('signed','paid','complete','completed')) then
    raise exception 'This lead has a contract or client attached. Ask an admin to remove it.';
  end if;
  return old;
end $$;
drop trigger if exists nl_bdr_lead_delete_guard on public.nl_bdr_leads;
create trigger nl_bdr_lead_delete_guard before delete on public.nl_bdr_leads for each row execute function public.nl_bdr_lead_delete_guard();

-- 5) Paid deals that have no commission sale yet (so a sale is never forgotten).
create or replace function public.nl_paid_deals_without_sale()
returns table (deal_id uuid, deal_name text, setup_fee numeric, payment_plan boolean, assigned_user uuid, closer_hire_id uuid, closer_name text)
language sql stable security definer set search_path = public as $$
  select d.id, d.deal_name, d.initial_fee, d.payment_plan, d.assigned_user, h.id, h.full_name
  from crm_deals d
  left join nl_contractor_hires h on h.user_id = d.assigned_user
  where private.is_admin_or_operator(auth.uid())
    and d.client_id = '00000000-0000-0000-0000-0000000000ff'
    and exists (select 1 from nl_billing_schedule b where b.deal_id = d.id and b.status = 'paid' and b.kind in ('setup','setup_installment_1','setup_installment_2','annual'))
    and not exists (select 1 from nl_commission_sales s where s.deal_id = d.id)
  order by d.updated_at desc;
$$;
revoke all on function public.nl_paid_deals_without_sale() from public, anon;
grant execute on function public.nl_paid_deals_without_sale() to authenticated;

-- 6) Admin-only functions shouldn't be callable by anonymous users at all (PUBLIC default grant removed too).
revoke all on function public.nl_auto_pull_now(uuid, integer) from public, anon;
grant execute on function public.nl_auto_pull_now(uuid, integer) to authenticated;
revoke all on function public.nl_pool_assign(uuid, text, text, text, integer) from public, anon;
grant execute on function public.nl_pool_assign(uuid, text, text, text, integer) to authenticated;
revoke all on function public.nl_pool_pull(text, text, text, integer) from public, anon;
grant execute on function public.nl_pool_pull(text, text, text, integer) to authenticated;
revoke all on function public.nl_territory_move(uuid, integer) from public, anon;
grant execute on function public.nl_territory_move(uuid, integer) to authenticated;
