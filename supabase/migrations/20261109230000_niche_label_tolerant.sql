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
