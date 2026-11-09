-- Daily auto-pull: the evening before every work day (Sun–Thu), each salesman gets 150 new leads in the Dialer.
-- City queue: each salesman's territories are an ORDERED list of cities. The pull works the current city;
-- when it has no leads left it moves on to the next city in the list. A city is "done" once AdvizorPro has no more
-- new firms there (source_exhausted, set by the loader) and the pool has none left for it.

alter table public.nl_lead_territories add column if not exists position int;
alter table public.nl_lead_territories add column if not exists status text not null default 'queued';
alter table public.nl_lead_territories add column if not exists source_exhausted boolean not null default false;
alter table public.nl_lead_territories add column if not exists started_at timestamptz;
alter table public.nl_lead_territories add column if not exists done_at timestamptz;
do $$ begin
  alter table public.nl_lead_territories add constraint nl_lead_territories_status_chk check (status in ('queued', 'current', 'done'));
exception when duplicate_object then null; end $$;
-- One salesman per city, so two reps never call the same firms.
create unique index if not exists nl_lead_territories_city_one_rep
  on public.nl_lead_territories (upper(state), upper(city)) where active and city is not null;

-- Number existing rows per rep in created order.
update public.nl_lead_territories t set position = s.rn
from (select id, row_number() over (partition by rep_user_id order by created_at) rn from public.nl_lead_territories) s
where s.id = t.id and t.position is null;

-- New rows go to the end of that rep's list.
create or replace function public.nl_territory_default_position()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.position is null then
    select coalesce(max(position), 0) + 1 into new.position from nl_lead_territories where rep_user_id = new.rep_user_id;
  end if;
  return new;
end $$;
drop trigger if exists nl_territory_default_position on public.nl_lead_territories;
create trigger nl_territory_default_position before insert on public.nl_lead_territories
for each row execute function public.nl_territory_default_position();

create table if not exists public.nl_lead_auto_pull_settings (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default true,
  leads_per_day int not null default 150 check (leads_per_day between 1 and 500),
  updated_at timestamptz not null default now()
);
insert into public.nl_lead_auto_pull_settings (id) values (1) on conflict do nothing;
alter table public.nl_lead_auto_pull_settings enable row level security;
drop policy if exists admin_all on public.nl_lead_auto_pull_settings;
create policy admin_all on public.nl_lead_auto_pull_settings for all using (private.is_admin_or_operator(auth.uid())) with check (private.is_admin_or_operator(auth.uid()));

create table if not exists public.nl_lead_auto_pull_log (
  id uuid primary key default gen_random_uuid(),
  run_at timestamptz not null default now(),
  rep_user_id uuid not null,
  requested int not null,
  pulled int not null,
  cities text[] not null default '{}',
  note text
);
create index if not exists nl_lead_auto_pull_log_rep on public.nl_lead_auto_pull_log (rep_user_id, run_at desc);
alter table public.nl_lead_auto_pull_log enable row level security;
drop policy if exists admin_all on public.nl_lead_auto_pull_log;
create policy admin_all on public.nl_lead_auto_pull_log for all using (private.is_admin_or_operator(auth.uid())) with check (private.is_admin_or_operator(auth.uid()));
drop policy if exists rep_own_read on public.nl_lead_auto_pull_log;
create policy rep_own_read on public.nl_lead_auto_pull_log for select using (rep_user_id = auth.uid());

-- Pulled leads land in a Dialer list named after their city ("Irvine, CA").

create or replace function public.nl_auto_pull_for(_rep uuid, _count int default null)
returns int language plpgsql security definer set search_path = public as $$
declare
  need int; got int; total int := 0; c record; left_in_city int; used text[] := '{}'; why text; note text := null;
begin
  need := coalesce(_count, (select leads_per_day from nl_lead_auto_pull_settings where id = 1), 150);
  why := nl_contractor_sell_block_reason(_rep);
  if why is not null then
    insert into nl_lead_auto_pull_log (rep_user_id, requested, pulled, note) values (_rep, need, 0, 'Skipped: ' || why);
    return 0;
  end if;
  for c in
    select * from nl_lead_territories t
    where t.rep_user_id = _rep and t.active and t.status <> 'done'
    order by (t.city is null), t.position nulls last, t.created_at
  loop
    exit when need <= 0;
    if c.status = 'queued' then
      update nl_lead_territories set status = 'current', started_at = now() where id = c.id;
    end if;
    got := nl_pool_claim_for(_rep, c.state, c.city, 'any', need);
    if got > 0 then used := used || (coalesce(c.city, 'All of') || ', ' || upper(c.state) || ' (' || got || ')'); end if;
    need := need - got; total := total + got;
    if c.city is not null then
      select count(*) into left_in_city from nl_lead_pool_firms p
      where p.status = 'available' and upper(p.state) = upper(c.state) and upper(p.city) = upper(c.city);
      if left_in_city = 0 and c.source_exhausted then
        update nl_lead_territories set status = 'done', done_at = now() where id = c.id;
      end if;
    end if;
  end loop;
  if need > 0 then
    note := 'Short ' || need || ': not enough loaded leads in this salesman''s cities. The next AdvizorPro load fills them.';
  end if;
  insert into nl_lead_auto_pull_log (rep_user_id, requested, pulled, cities, note) values (_rep, total + need, total, used, note);
  return total;
end $$;

-- Every salesman (marketing_staff) who has at least one active territory.
create or replace function public.nl_auto_pull_daily()
returns int language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  if not coalesce((select enabled from nl_lead_auto_pull_settings where id = 1), false) then return 0; end if;
  for r in
    select distinct t.rep_user_id from nl_lead_territories t
    join user_roles ur on ur.user_id = t.rep_user_id and ur.role = 'marketing_staff'
    where t.active
  loop
    n := n + nl_auto_pull_for(r.rep_user_id);
  end loop;
  return n;
end $$;
revoke all on function public.nl_auto_pull_for(uuid, int) from public, anon, authenticated;
revoke all on function public.nl_auto_pull_daily() from public, anon, authenticated;

-- Admin: run the pull now for one salesman (e.g. a new hire mid-week).
create or replace function public.nl_auto_pull_now(_rep uuid, _count int default null)
returns int language plpgsql security definer set search_path = public as $$
begin
  if not private.is_admin_or_operator(auth.uid()) then raise exception 'Admins only'; end if;
  return nl_auto_pull_for(_rep, _count);
end $$;
grant execute on function public.nl_auto_pull_now(uuid, int) to authenticated;

-- Admin: move a city up/down in a salesman's list.
create or replace function public.nl_territory_move(_id uuid, _dir int)
returns void language plpgsql security definer set search_path = public as $$
declare me record; other record;
begin
  if not private.is_admin_or_operator(auth.uid()) then raise exception 'Admins only'; end if;
  select * into me from nl_lead_territories where id = _id;
  select * into other from nl_lead_territories
    where rep_user_id = me.rep_user_id and id <> me.id
      and case when _dir < 0 then position < me.position else position > me.position end
    order by case when _dir < 0 then -position else position end limit 1;
  if other.id is null then return; end if;
  update nl_lead_territories set position = other.position where id = me.id;
  update nl_lead_territories set position = me.position where id = other.id;
end $$;
grant execute on function public.nl_territory_move(uuid, int) to authenticated;

-- Admin page: each territory with what's waiting in the pool for it.
create or replace function public.nl_territory_queue()
returns table (id uuid, rep_user_id uuid, state text, city text, queue_position int, status text, source_exhausted boolean,
               available int, with_reps int, started_at timestamptz, done_at timestamptz)
language sql stable security definer set search_path = public as $$
  select t.id, t.rep_user_id, upper(t.state), t.city, t.position, t.status, t.source_exhausted,
    (select count(*)::int from nl_lead_pool_firms p where p.status = 'available' and upper(p.state) = upper(t.state)
       and (t.city is null or upper(p.city) = upper(t.city))),
    (select count(*)::int from nl_lead_pool_firms p where p.status = 'claimed' and upper(p.state) = upper(t.state)
       and (t.city is null or upper(p.city) = upper(t.city))),
    t.started_at, t.done_at
  from nl_lead_territories t
  where t.active and private.is_admin_or_operator(auth.uid())
  order by t.rep_user_id, (t.city is null), t.position
$$;
grant execute on function public.nl_territory_queue() to authenticated;

-- 01:00 UTC Mon–Fri = 5pm Pacific (6pm in summer) Sun–Thu: the evening before each work day.
select cron.unschedule('nl-lead-auto-pull-daily') where exists (select 1 from cron.job where jobname = 'nl-lead-auto-pull-daily');
select cron.schedule('nl-lead-auto-pull-daily', '0 1 * * 1-5', $c$select public.nl_auto_pull_daily();$c$);

-- Pulled leads land in a Dialer list named after their city ("Irvine, CA") instead of "AdvizorPro Pool".
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
          coalesce(top.email, f.general_email), 'advizorpro', coalesce(nullif(initcap(f.city), '') || ', ' || upper(f.state), 'AdvizorPro Pool'), 'cold', f.id)
      returning id into new_id;
    exception when unique_violation then
      begin
        insert into public.nl_bdr_leads (user_id, client_id, business_name, owner_name, website, niche, city, state, crd,
            email, lead_source, list_name, pipeline_stage, pool_firm_id, notes)
        values (_rep, internal, f.name, top.full_name, f.website, type_label, f.city, upper(f.state), f.crd,
            coalesce(top.email, f.general_email), 'advizorpro', coalesce(nullif(initcap(f.city), '') || ', ' || upper(f.state), 'AdvizorPro Pool'), 'cold', f.id,
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
