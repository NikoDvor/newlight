-- Weekly AdvizorPro uploads may carry a raw "Firm Type" text instead of ria/ibd/hybrid. Map it either way.
create or replace function public.nl_niche_label(_t text)
returns text language sql immutable as $$
  select case
    when _t is null or trim(_t) = '' then null
    when lower(_t) ~ 'hybrid|dual' then 'Hybrid'
    when lower(_t) ~ 'insur' then 'Insurance'
    when lower(_t) ~ '^(bd|ibd)$|broker|independent' then 'Advisor'
    when lower(_t) ~ '^ria$|advis' then 'RIA'
    else null end
$$;

-- The weekly pool upload is fresher than the one-time nl_firm_types seed, so the pool wins.
create or replace function public.nl_bdr_lead_firm_niche(_crd text, _pool uuid, _source text)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    case when _source ilike '%insurance%' then 'Insurance' end,
    (select nl_niche_label(p.firm_type) from nl_lead_pool_firms p where p.id = _pool),
    (select nl_niche_label(p.firm_type) from nl_lead_pool_firms p where _crd is not null and p.crd = _crd order by p.updated_at desc nulls last limit 1),
    (select nl_niche_label(t.firm_type) from nl_firm_types t where t.crd = _crd),
    (select 'RIA' from sec_adv_services s where _crd is not null and s.crd = _crd limit 1)
  )
$$;
