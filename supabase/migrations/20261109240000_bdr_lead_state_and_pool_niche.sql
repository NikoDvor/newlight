-- Dialer location filter: leads get a separate state column. Filled from "City, ST", the pool firm, or a "City, ST" list name.
alter table public.nl_bdr_leads add column if not exists state text;

create or replace function public.nl_bdr_lead_fill_location()
returns trigger language plpgsql security definer set search_path = public as $$
declare m text[];
begin
  if new.city is not null and new.state is null then
    m := regexp_match(new.city, '^\s*([^,]+),\s*([A-Za-z]{2})\s*$');
    if m is not null then new.city := trim(m[1]); new.state := upper(m[2]); end if;
  end if;
  if (new.city is null or new.state is null) and new.pool_firm_id is not null then
    select coalesce(new.city, p.city), coalesce(new.state, upper(p.state)) into new.city, new.state
    from nl_lead_pool_firms p where p.id = new.pool_firm_id;
  end if;
  if new.city is null and new.state is null and new.list_name is not null then
    m := regexp_match(new.list_name, '^\s*([^,(]+),\s*([A-Za-z]{2})(\s|\(|$)');
    if m is not null then new.city := trim(m[1]); new.state := upper(m[2]); end if;
  end if;
  if new.state is not null then new.state := upper(trim(new.state)); end if;
  return new;
end $$;
drop trigger if exists nl_bdr_lead_fill_location on public.nl_bdr_leads;
create trigger nl_bdr_lead_fill_location before insert or update of city, state, pool_firm_id, list_name on public.nl_bdr_leads
for each row execute function public.nl_bdr_lead_fill_location();
update public.nl_bdr_leads set city = city where state is null;

-- Pool claims: niche uses the same labels as the dialer filter (RIA / Hybrid / Advisor / Insurance) and the lead gets the firm's state.
update public.nl_bdr_leads set niche = public.nl_niche_label(niche) where niche in ('Independent BD', 'Independent Advisor');

CREATE OR REPLACE FUNCTION public.nl_pool_claim_for(_rep uuid, _state text, _city text, _firm_type text, _count integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  f record; top record; n int := 0; new_id uuid;
  internal constant uuid := '00000000-0000-0000-0000-0000000000ff';
  type_label text;
begin
  if _count is null or _count < 1 then return 0; end if;
  if _count > 500 then _count := 500; end if;
  for f in
    select * from public.nl_lead_pool_firms p
    where p.status = 'available'
      and (_state is null or upper(p.state) = upper(_state))
      and (_city is null or upper(p.city) = upper(_city))
      and (_firm_type is null or _firm_type = 'any' or p.firm_type = _firm_type)
    order by (p.signal is not null) desc,
             (_rep = any(p.previous_owner_ids)) asc,
             case p.firm_type when 'ria' then 1 when 'ibd' then 2 when 'hybrid' then 3 when 'independent_advisor' then 4 else 5 end,
             p.recycle_count asc, p.created_at asc
    limit _count
    for update skip locked
  loop
    top := null;
    select * into top from public.nl_lead_pool_contacts c
      where c.firm_id = f.id and not c.do_not_call order by c.rank, c.created_at limit 1;
    type_label := public.nl_niche_label(f.firm_type);
    begin
      insert into public.nl_bdr_leads (user_id, client_id, business_name, owner_name, phone, front_desk_phone,
          owner_direct_phone, website, niche, city, state, crd, email, lead_source, list_name, pipeline_stage, pool_firm_id)
      values (_rep, internal, f.name, top.full_name, f.main_phone, f.main_phone,
          coalesce(top.mobile_phone, top.landline_phone, top.phone), f.website, type_label, f.city, upper(f.state), f.crd,
          coalesce(top.email, f.general_email), 'advizorpro', 'AdvizorPro Pool', 'cold', f.id)
      returning id into new_id;
    exception when unique_violation then
      begin
        insert into public.nl_bdr_leads (user_id, client_id, business_name, owner_name, website, niche, city, state, crd,
            email, lead_source, list_name, pipeline_stage, pool_firm_id, notes)
        values (_rep, internal, f.name, top.full_name, f.website, type_label, f.city, upper(f.state), f.crd,
            coalesce(top.email, f.general_email), 'advizorpro', 'AdvizorPro Pool', 'cold', f.id,
            'Phone shared with another lead — see Decision Makers for numbers.')
        returning id into new_id;
      exception when others then
        update public.nl_lead_pool_firms set status = 'disqualified', updated_at = now() where id = f.id;
        continue;
      end;
    end;
    update public.nl_lead_pool_firms
      set status = 'claimed', owner_rep_id = _rep, lead_id = new_id, claimed_at = now(),
          last_activity_at = now(), attempt_count = 0, updated_at = now()
      where id = f.id;
    n := n + 1;
  end loop;
  return n;
end $function$;
