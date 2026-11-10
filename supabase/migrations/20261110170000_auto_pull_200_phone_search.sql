-- 200 new leads per salesman per work day (Sun–Thu evenings).
update public.nl_lead_auto_pull_settings set leads_per_day = 200, updated_at = now() where id = 1;

-- Daily pull only works city rows. A whole-state row just records the salesman's state; the daily load
-- turns it into a starting city before the pull runs (so a state-wide pull never takes another rep's city).
-- (nl_auto_pull_for / nl_auto_pull_daily: added "and t.city is not null" to their territory loops.)

-- Dialer search by phone: matches any decision maker's number at the salesman's pool firms.
create or replace function public.nl_dialer_find_by_phone(_digits text)
returns table (lead_id uuid, matched_name text, matched_phone text)
language sql stable security definer set search_path = public as $$
  with q as (select regexp_replace(coalesce(_digits, ''), '\D', '', 'g') d)
  select l.id, c.full_name, coalesce(c.mobile_phone, c.landline_phone, c.phone)
  from nl_bdr_leads l
  join nl_lead_pool_contacts c on c.firm_id = l.pool_firm_id
  cross join q
  where l.user_id = auth.uid() and length(q.d) >= 4
    and (regexp_replace(coalesce(c.mobile_phone, ''), '\D', '', 'g') like '%' || q.d || '%'
      or regexp_replace(coalesce(c.landline_phone, ''), '\D', '', 'g') like '%' || q.d || '%'
      or regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') like '%' || q.d || '%')
  limit 20
$$;
revoke all on function public.nl_dialer_find_by_phone(text) from public, anon;
grant execute on function public.nl_dialer_find_by_phone(text) to authenticated;
