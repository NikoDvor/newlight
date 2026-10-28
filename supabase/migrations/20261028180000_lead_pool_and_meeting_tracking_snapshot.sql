-- Snapshot of the AdvizorPro lead pool + meeting tracking objects.
-- These were created directly in the database (Oct 22–28, 2026); this file records
-- them in the repo so a rebuilt database gets them back. Every statement is safe to
-- re-run (IF NOT EXISTS / OR REPLACE / DROP-then-CREATE for policies).

-- Lead Pool (AdvizorPro-fed) — tables, RLS, claim/assign RPCs, recycle job
create table if not exists public.nl_lead_import_batches (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid,
  file_name text,
  export_kind text,                -- firms | people
  firms_added int default 0,
  firms_updated int default 0,
  contacts_added int default 0,
  rows_skipped int default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.nl_lead_import_mappings (
  id uuid primary key default gen_random_uuid(),
  export_kind text not null unique,  -- firms | people
  column_map jsonb not null default '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

create table if not exists public.nl_lead_pool_firms (
  id uuid primary key default gen_random_uuid(),
  crd text unique,
  name text not null,
  alt_names text[],
  firm_type text,                  -- ria | ibd | hybrid | independent_advisor
  size_tier text,                  -- small | mid | large
  signal text,                     -- new_firm | breakaway | null
  signal_date date,
  city text, state text, zip text, address text,
  main_phone text, general_email text, website text,
  linkedin_url text, facebook_url text, x_url text,
  aum numeric, aum_growth_1y_pct numeric, aum_growth_3y_pct numeric,
  employees int, total_reps int, advisory_clients int, avg_account_size numeric,
  fee_structures text[], client_personas text[], services text[],
  crm_tags text[], technology_tags text[], custodians text[],
  year_founded int, team_avg_age numeric, description text,
  extra jsonb not null default '{}'::jsonb,
  status text not null default 'available'
    check (status in ('available','claimed','cooldown','dnc','converted','disqualified')),
  owner_rep_id uuid,
  lead_id uuid,
  claimed_at timestamptz,
  last_activity_at timestamptz,
  attempt_count int not null default 0,
  cooldown_until timestamptz,
  recycle_count int not null default 0,
  previous_owner_ids uuid[] not null default '{}',
  import_batch_id uuid references public.nl_lead_import_batches(id) on delete set null,
  source text not null default 'advizorpro',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists nl_lead_pool_firms_pick_idx on public.nl_lead_pool_firms (status, state, city);
create index if not exists nl_lead_pool_firms_owner_idx on public.nl_lead_pool_firms (owner_rep_id);

create table if not exists public.nl_lead_pool_contacts (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.nl_lead_pool_firms(id) on delete cascade,
  individual_crd text,
  full_name text not null,
  first_name text, last_name text,
  title text, titles text[],
  is_owner boolean not null default false,
  is_advisor boolean, is_broker boolean,
  phone text, mobile_phone text, landline_phone text,
  email text, personal_email text, linkedin_url text,
  years_experience int, est_age int,
  designations text[], prior_firm text,
  breakaway_date date, job_start_date date,
  hobbies text[], education text[],
  disclosure_count int,
  rank int not null default 100,     -- lower = call first (owners first)
  do_not_call boolean not null default false,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists nl_lead_pool_contacts_firm_crd_uniq
  on public.nl_lead_pool_contacts (firm_id, individual_crd) where individual_crd is not null;
create index if not exists nl_lead_pool_contacts_firm_idx on public.nl_lead_pool_contacts (firm_id, rank);

create table if not exists public.nl_lead_territories (
  id uuid primary key default gen_random_uuid(),
  rep_user_id uuid not null,
  state text not null,
  city text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists nl_lead_territories_uniq
  on public.nl_lead_territories (rep_user_id, upper(state), coalesce(upper(city), ''));

create table if not exists public.nl_lead_call_log (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null,
  contact_id uuid references public.nl_lead_pool_contacts(id) on delete set null,
  user_id uuid not null,
  phone text,
  phone_kind text,                  -- mobile | office | front_desk | other
  outcome text,
  notes text,
  called_at timestamptz not null default now()
);
create index if not exists nl_lead_call_log_lead_idx on public.nl_lead_call_log (lead_id, called_at desc);

create table if not exists public.nl_dnc_numbers (
  phone_normalized text primary key,
  reason text,
  contact_id uuid,
  added_by uuid,
  created_at timestamptz not null default now()
);

alter table public.nl_bdr_leads add column if not exists pool_firm_id uuid references public.nl_lead_pool_firms(id) on delete set null;

-- RLS
alter table public.nl_lead_import_batches enable row level security;
alter table public.nl_lead_import_mappings enable row level security;
alter table public.nl_lead_pool_firms enable row level security;
alter table public.nl_lead_pool_contacts enable row level security;
alter table public.nl_lead_territories enable row level security;
alter table public.nl_lead_call_log enable row level security;
alter table public.nl_dnc_numbers enable row level security;

drop policy if exists admin_all on public.nl_lead_import_batches;
drop policy if exists admin_all on public.nl_lead_import_batches;
create policy admin_all on public.nl_lead_import_batches for all using (private.is_admin_or_operator(auth.uid())) with check (private.is_admin_or_operator(auth.uid()));
drop policy if exists admin_all on public.nl_lead_import_mappings;
drop policy if exists admin_all on public.nl_lead_import_mappings;
create policy admin_all on public.nl_lead_import_mappings for all using (private.is_admin_or_operator(auth.uid())) with check (private.is_admin_or_operator(auth.uid()));

drop policy if exists admin_all on public.nl_lead_pool_firms;
drop policy if exists admin_all on public.nl_lead_pool_firms;
create policy admin_all on public.nl_lead_pool_firms for all using (private.is_admin_or_operator(auth.uid())) with check (private.is_admin_or_operator(auth.uid()));
drop policy if exists rep_own_read on public.nl_lead_pool_firms;
drop policy if exists rep_own_read on public.nl_lead_pool_firms;
create policy rep_own_read on public.nl_lead_pool_firms for select using (owner_rep_id = auth.uid());

drop policy if exists admin_all on public.nl_lead_pool_contacts;
drop policy if exists admin_all on public.nl_lead_pool_contacts;
create policy admin_all on public.nl_lead_pool_contacts for all using (private.is_admin_or_operator(auth.uid())) with check (private.is_admin_or_operator(auth.uid()));
drop policy if exists rep_own_read on public.nl_lead_pool_contacts;
drop policy if exists rep_own_read on public.nl_lead_pool_contacts;
create policy rep_own_read on public.nl_lead_pool_contacts for select using (exists (select 1 from public.nl_lead_pool_firms f where f.id = firm_id and f.owner_rep_id = auth.uid()));

drop policy if exists admin_all on public.nl_lead_territories;
drop policy if exists admin_all on public.nl_lead_territories;
create policy admin_all on public.nl_lead_territories for all using (private.is_admin_or_operator(auth.uid())) with check (private.is_admin_or_operator(auth.uid()));
drop policy if exists rep_own_read on public.nl_lead_territories;
drop policy if exists rep_own_read on public.nl_lead_territories;
create policy rep_own_read on public.nl_lead_territories for select using (rep_user_id = auth.uid());

drop policy if exists admin_all on public.nl_lead_call_log;
drop policy if exists admin_all on public.nl_lead_call_log;
create policy admin_all on public.nl_lead_call_log for all using (private.is_admin_or_operator(auth.uid())) with check (private.is_admin_or_operator(auth.uid()));
drop policy if exists rep_own on public.nl_lead_call_log;
drop policy if exists rep_own on public.nl_lead_call_log;
create policy rep_own on public.nl_lead_call_log for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists admin_all on public.nl_dnc_numbers;
drop policy if exists admin_all on public.nl_dnc_numbers;
create policy admin_all on public.nl_dnc_numbers for all using (private.is_admin_or_operator(auth.uid())) with check (private.is_admin_or_operator(auth.uid()));
drop policy if exists team_read on public.nl_dnc_numbers;
drop policy if exists team_read on public.nl_dnc_numbers;
create policy team_read on public.nl_dnc_numbers for select using (auth.uid() is not null);
drop policy if exists team_insert on public.nl_dnc_numbers;
drop policy if exists team_insert on public.nl_dnc_numbers;
create policy team_insert on public.nl_dnc_numbers for insert with check (auth.uid() is not null and added_by = auth.uid());

-- Core claim logic (used by rep "Pull leads" and admin "Assign")

-- Meetings: extra meetings, check-ins, skipped-discovery flag (Oct 28, 2026)
alter table public.bdr_calendar_events add column if not exists is_extra boolean not null default false;
alter table public.bdr_calendar_events add column if not exists extra_type text;
alter table public.bdr_calendar_events drop constraint if exists bdr_calendar_events_meeting_kind_check;
alter table public.bdr_calendar_events add constraint bdr_calendar_events_meeting_kind_check check (meeting_kind = any (array['discovery','closing','onboarding','service','check_in']));
alter table public.bdr_calendar_events drop constraint if exists bdr_calendar_events_source_check;
alter table public.bdr_calendar_events add constraint bdr_calendar_events_source_check check (source = any (array['dialer','manual','booking_form','sdr_mirror','round_robin','closing_meeting','onboarding_meeting','admin_weekly_recurring','service_meeting','extra_meeting']));
alter table public.bdr_meeting_outcomes drop constraint if exists bdr_meeting_outcomes_meeting_kind_check;
alter table public.bdr_meeting_outcomes add constraint bdr_meeting_outcomes_meeting_kind_check check (meeting_kind = any (array['discovery','closing','onboarding','pay_sign','check_in']));
alter table public.nl_bdr_leads add column if not exists skipped_discovery boolean not null default false;

-- Functions (current definitions)
CREATE OR REPLACE FUNCTION public.bdr_events_set_kind_attempt()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.meeting_kind IS NULL THEN
    NEW.meeting_kind := public.bdr_event_meeting_kind_from_source(NEW.source);
  END IF;
  IF NEW.meeting_kind IS NOT NULL AND NEW.lead_id IS NOT NULL AND NEW.attempt_number IS NULL THEN
    SELECT 1 + count(*) INTO NEW.attempt_number
    FROM public.bdr_calendar_events
    WHERE lead_id = NEW.lead_id AND meeting_kind = NEW.meeting_kind;
  END IF;
  IF NEW.lead_id IS NOT NULL AND NEW.meeting_kind IN ('discovery','closing','onboarding','check_in') THEN
    SELECT 1 + count(*) INTO NEW.meeting_sequence
    FROM public.bdr_calendar_events
    WHERE lead_id = NEW.lead_id AND meeting_kind IN ('discovery','closing','onboarding','check_in');
  END IF;
  RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.expire_stale_pipeline_leads()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_count integer;
BEGIN
  WITH updated AS (
    UPDATE public.nl_bdr_leads l
    SET pipeline_stage = 'expired_no_close_prep', status = 'inactive', updated_at = now()
    WHERE l.crm_deal_id IS NULL
      AND l.unattended_since IS NULL
      AND coalesce(l.pipeline_stage,'') = 'warm'
      AND coalesce(l.status,'') <> 'closed_lost'
      AND EXISTS (
        SELECT 1 FROM public.bdr_calendar_events e
        WHERE e.lead_id = l.id
          AND coalesce(e.meeting_kind, e.metadata->>'meeting_kind') = 'discovery'
          AND coalesce(e.attendance,'pending') NOT IN ('rescheduled','cancelled')
          AND e.starts_at < now() - interval '24 hours')
      AND NOT EXISTS (
        SELECT 1 FROM public.bdr_calendar_events e
        WHERE e.lead_id = l.id
          AND (e.meeting_kind IS NOT NULL OR e.metadata->>'meeting_kind' = 'discovery')
          AND coalesce(e.attendance,'pending') NOT IN ('rescheduled','cancelled')
          AND e.starts_at >= now() - interval '24 hours')
    RETURNING 1)
  SELECT count(*) INTO v_count FROM updated;
  RETURN v_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.nl_contact_rank(_owner boolean, _title text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case
    when coalesce(_owner,false) then 1
    when _title ~* '(chief executive|\mceo\M|founder)' or (_title ~* 'president' and _title !~* 'vice[ -]?president|\mvp\M') then 2
    when _title ~* '(managing (partner|director|member)|principal)' then 3
    when _title ~* '(chief compliance|\mcco\M)' then 4
    when _title ~* '(partner|chief|\mcoo\M|\mcfo\M|\mcio\M)' then 5
    when _title ~* '(marketing|growth|business development)' then 6
    when _title ~* '(vice[ -]?president|\mvp\M|director)' then 7
    else 10 end $function$
;

CREATE OR REPLACE FUNCTION public.nl_dialer_lead_details(_lead_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare _uid uuid := auth.uid(); _admin boolean; _out jsonb;
begin
  if _uid is null then raise exception 'Not signed in'; end if;
  _admin := private.is_admin_or_operator(_uid);
  select coalesce(jsonb_object_agg(l.id::text, jsonb_build_object(
    'firm', case when f.id is null then null else jsonb_build_object(
      'id',f.id,'crd',f.crd,'firm_type',f.firm_type,'size_tier',f.size_tier,'signal',f.signal,'signal_date',f.signal_date,
      'city',f.city,'state',f.state,'main_phone',f.main_phone,'website',f.website,'linkedin_url',f.linkedin_url,
      'aum',f.aum,'aum_growth_1y_pct',f.aum_growth_1y_pct,'aum_growth_3y_pct',f.aum_growth_3y_pct,
      'employees',f.employees,'total_reps',f.total_reps,'advisory_clients',f.advisory_clients,'avg_account_size',f.avg_account_size,
      'fee_structures',f.fee_structures,'client_personas',f.client_personas,'services',f.services,'crm_tags',f.crm_tags,
      'technology_tags',f.technology_tags,'custodians',f.custodians,'year_founded',f.year_founded,'team_avg_age',f.team_avg_age,
      'description',f.description) end,
    'contacts', coalesce((select jsonb_agg(jsonb_build_object(
        'id',c.id,'full_name',c.full_name,'title',c.title,'titles',c.titles,'is_owner',c.is_owner,'is_advisor',c.is_advisor,'is_broker',c.is_broker,
        'mobile_phone',coalesce(c.mobile_phone, case when c.landline_phone is null then c.phone end),
        'office_phone',coalesce(c.landline_phone, case when c.mobile_phone is not null then c.phone end),
        'email',c.email,'linkedin_url',c.linkedin_url,'years_experience',c.years_experience,'designations',c.designations,
        'breakaway_date',c.breakaway_date,'prior_firm',c.prior_firm,
        'do_not_call', c.do_not_call,
        'mobile_dnc', exists(select 1 from nl_dnc_numbers d where d.phone_normalized = public.nl_phone10(coalesce(c.mobile_phone, case when c.landline_phone is null then c.phone end))),
        'office_dnc', exists(select 1 from nl_dnc_numbers d where d.phone_normalized = public.nl_phone10(coalesce(c.landline_phone, case when c.mobile_phone is not null then c.phone end)))
      ) order by c.rank, c.is_owner desc, c.full_name) from nl_lead_pool_contacts c where c.firm_id=f.id),'[]'::jsonb),
    'calls', coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'contact_id',g.contact_id,'contact_name',pc.full_name,'phone',g.phone,'phone_kind',g.phone_kind,'outcome',g.outcome,'notes',g.notes,'called_at',g.called_at) order by g.called_at desc)
        from nl_lead_call_log g left join nl_lead_pool_contacts pc on pc.id=g.contact_id where g.lead_id=l.id),'[]'::jsonb),
    'front_desk_dnc', exists(select 1 from nl_dnc_numbers d where d.phone_normalized = public.nl_phone10(coalesce(l.front_desk_phone,l.phone)))
  )),'{}'::jsonb) into _out
  from nl_bdr_leads l left join nl_lead_pool_firms f on f.id=l.pool_firm_id
  where l.id = any(_lead_ids) and (_admin or l.user_id=_uid);
  return _out;
end $function$
;

CREATE OR REPLACE FUNCTION public.nl_jbool(v jsonb)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case when v is null or v = 'null'::jsonb then null
    else lower(trim(v #>> '{}')) in ('true','t','yes','y','1','x') end $function$
;

CREATE OR REPLACE FUNCTION public.nl_jdate(v jsonb)
 RETURNS date
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
begin
  if v is null or v = 'null'::jsonb or trim(v #>> '{}') = '' then return null; end if;
  return (v #>> '{}')::date;
exception when others then return null;
end $function$
;

CREATE OR REPLACE FUNCTION public.nl_jnum(v jsonb)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case when v is null or v = 'null'::jsonb or trim(v #>> '{}') = '' then null
    else nullif(regexp_replace(v #>> '{}', '[^0-9.\-]', '', 'g'), '')::numeric end $function$
;

CREATE OR REPLACE FUNCTION public.nl_jtext_array(v jsonb)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case
    when v is null or v = 'null'::jsonb then null
    when jsonb_typeof(v) = 'array' then array(select trim(x) from jsonb_array_elements_text(v) x where trim(x) <> '')
    else array(select trim(x) from regexp_split_to_table(v #>> '{}', '\s*[;|]\s*') x where trim(x) <> '')
  end $function$
;

CREATE OR REPLACE FUNCTION public.nl_log_call(_lead_id uuid, _contact_id uuid DEFAULT NULL::uuid, _phone text DEFAULT NULL::text, _phone_kind text DEFAULT NULL::text, _outcome text DEFAULT NULL::text, _notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare _uid uuid := auth.uid(); _id uuid; _firm uuid;
begin
  if _uid is null then raise exception 'Not signed in'; end if;
  select pool_firm_id into _firm from nl_bdr_leads where id=_lead_id and (user_id=_uid or private.is_admin_or_operator(_uid));
  if not found then raise exception 'Lead not found'; end if;
  insert into nl_lead_call_log(lead_id,contact_id,user_id,phone,phone_kind,outcome,notes)
  values(_lead_id,_contact_id,_uid,_phone,_phone_kind,nullif(_outcome,''),nullif(_notes,'')) returning id into _id;
  if _firm is not null then
    update nl_lead_pool_firms set attempt_count=coalesce(attempt_count,0)+1, last_activity_at=now() where id=_firm;
  end if;
  return _id;
end $function$
;

CREATE OR REPLACE FUNCTION public.nl_mark_dnc(_phone text, _contact_id uuid DEFAULT NULL::uuid, _reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare _n text := public.nl_phone10(_phone);
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if _n is not null then
    insert into nl_dnc_numbers(phone_normalized,reason,contact_id,added_by) values(_n,_reason,_contact_id,auth.uid())
    on conflict (phone_normalized) do nothing;
  end if;
  if _contact_id is not null then update nl_lead_pool_contacts set do_not_call=true, updated_at=now() where id=_contact_id; end if;
end $function$
;

CREATE OR REPLACE FUNCTION public.nl_meeting_effort(_since timestamp with time zone DEFAULT NULL::timestamp with time zone, _rep uuid DEFAULT NULL::uuid)
 RETURNS TABLE(rep_user_id uuid, rep_name text, meetings_held integer, extra_meetings integer, extra_by_type jsonb, won_clients integer, meetings_per_won numeric, lost_leads integer, meetings_per_lost numeric, avg_days_to_won numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare _uid uuid := auth.uid(); _admin boolean;
begin
  if _uid is null then raise exception 'Not signed in'; end if;
  _admin := private.is_admin_or_operator(_uid);
  return query
  with held as (            -- tracked meetings that actually happened
    select e.user_id, e.lead_id, e.starts_at from bdr_calendar_events e
    where e.lead_id is not null and e.meeting_kind in ('discovery','closing','onboarding','check_in')
      and e.attendance = 'attended'),
  firstm as (select lead_id, min(starts_at) first_at from bdr_calendar_events
             where lead_id is not null and meeting_kind in ('discovery','closing','onboarding','check_in')
               and coalesce(attendance,'pending') not in ('rescheduled','cancelled') group by lead_id),
  per_lead as (select lead_id, count(*) n from held group by lead_id),
  won as (select l.user_id, l.id lead_id, d.paid_signed_at from nl_bdr_leads l join crm_deals d on d.id = l.crm_deal_id
          where l.pipeline_stage = 'won' and d.paid_signed_at is not null and (_since is null or d.paid_signed_at >= _since)),
  lost as (select distinct o.rep_user_id user_id, o.lead_id from bdr_meeting_outcomes o
           join nl_bdr_leads l on l.id = o.lead_id
           where o.result = 'lost' and l.status = 'closed_lost' and (_since is null or o.logged_at >= _since)),
  extra as (select e.user_id, coalesce(e.extra_type,'other') t, count(*) n from bdr_calendar_events e
            where e.is_extra and coalesce(e.attendance,'pending') not in ('rescheduled','cancelled')
              and (_since is null or e.starts_at >= _since) group by 1,2),
  reps as (select distinct x.user_id from (
             select user_id from held union select user_id from won union select user_id from lost union select user_id from extra) x),
  rows as (
    select r.user_id,
      coalesce((select full_name from employee_profiles ep where ep.user_id = r.user_id limit 1), 'Salesman') nm,
      (select count(*) from held h where h.user_id = r.user_id and (_since is null or h.starts_at >= _since))::int mh,
      coalesce((select sum(n) from extra x where x.user_id = r.user_id),0)::int em,
      coalesce((select jsonb_object_agg(t, n) from extra x where x.user_id = r.user_id), '{}'::jsonb) ebt,
      (select count(*) from won w where w.user_id = r.user_id)::int wc,
      (select round(avg(coalesce(pl.n,0)),1) from won w left join per_lead pl on pl.lead_id = w.lead_id where w.user_id = r.user_id) mpw,
      (select count(*) from lost lo where lo.user_id = r.user_id)::int lc,
      (select round(avg(coalesce(pl.n,0)),1) from lost lo left join per_lead pl on pl.lead_id = lo.lead_id where lo.user_id = r.user_id) mpl,
      (select round(avg(extract(epoch from (w.paid_signed_at - f.first_at))/86400)::numeric,1) from won w join firstm f on f.lead_id = w.lead_id where w.user_id = r.user_id) dtw
    from reps r)
  select x.user_id, x.nm, x.mh, x.em, x.ebt, x.wc, x.mpw, x.lc, x.mpl, x.dtw from rows x
  where _admin and (_rep is null or x.user_id = _rep)
     or (not _admin and x.user_id = _uid)
  union all
  -- team average row (always included; aggregates only)
  select null::uuid, 'Team average',
    (select round(avg(mh))::int from rows), (select round(avg(em))::int from rows), '{}'::jsonb,
    (select round(avg(wc))::int from rows),
    (select round(avg(coalesce(pl.n,0)),1) from won w left join per_lead pl on pl.lead_id = w.lead_id),
    (select round(avg(lc))::int from rows),
    (select round(avg(coalesce(pl.n,0)),1) from lost lo left join per_lead pl on pl.lead_id = lo.lead_id),
    (select round(avg(extract(epoch from (w.paid_signed_at - f.first_at))/86400)::numeric,1) from won w join firstm f on f.lead_id = w.lead_id)
  where exists (select 1 from rows);
end $function$
;

CREATE OR REPLACE FUNCTION public.nl_phone10(t text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case when t is null then null else
    nullif(right(regexp_replace(t, '\D', '', 'g'), 10), '') end $function$
;

CREATE OR REPLACE FUNCTION public.nl_pool_assign(_rep uuid, _state text, _city text DEFAULT NULL::text, _firm_type text DEFAULT 'any'::text, _count integer DEFAULT 50)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not private.is_admin_or_operator(auth.uid()) then raise exception 'Admins only'; end if;
  return public.nl_pool_claim_for(_rep, _state, _city, _firm_type, _count);
end $function$
;

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
    type_label := case f.firm_type when 'ria' then 'RIA' when 'ibd' then 'Independent BD' when 'hybrid' then 'Hybrid'
                    when 'independent_advisor' then 'Independent Advisor' else null end;
    begin
      insert into public.nl_bdr_leads (user_id, client_id, business_name, owner_name, phone, front_desk_phone,
          owner_direct_phone, website, niche, city, crd, email, lead_source, list_name, pipeline_stage, pool_firm_id)
      values (_rep, internal, f.name, top.full_name, f.main_phone, f.main_phone,
          coalesce(top.mobile_phone, top.landline_phone, top.phone), f.website, type_label, f.city, f.crd,
          coalesce(top.email, f.general_email), 'advizorpro', 'AdvizorPro Pool', 'cold', f.id)
      returning id into new_id;
    exception when unique_violation then
      begin
        insert into public.nl_bdr_leads (user_id, client_id, business_name, owner_name, website, niche, city, crd,
            email, lead_source, list_name, pipeline_stage, pool_firm_id, notes)
        values (_rep, internal, f.name, top.full_name, f.website, type_label, f.city, f.crd,
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
end $function$
;

CREATE OR REPLACE FUNCTION public.nl_pool_import(_kind text, _rows jsonb, _file_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  r jsonb; b uuid; fid uuid; added int := 0; updated int := 0; contacts int := 0; skipped int := 0;
  v_crd text; v_type text; v_aum numeric; v_founded int; v_title text; v_owner boolean; v_break date;
  ins boolean;
begin
  if not private.is_admin_or_operator(auth.uid()) then raise exception 'Admins only'; end if;
  insert into nl_lead_import_batches (uploaded_by, file_name, export_kind) values (auth.uid(), _file_name, _kind) returning id into b;

  for r in select * from jsonb_array_elements(coalesce(_rows,'[]'::jsonb)) loop
    if _kind = 'firms' then
      v_crd := nullif(trim(r->>'crd'), '');
      if v_crd is null or coalesce(trim(r->>'name'),'') = '' then skipped := skipped + 1; continue; end if;
      v_type := coalesce(nullif(lower(r->>'firm_type'),''),
        case when nl_jbool(r->'is_advisor') and nl_jbool(r->'is_broker') then 'hybrid'
             when nl_jbool(r->'is_broker') then 'ibd'
             when nl_jbool(r->'is_advisor') then 'ria' end);
      v_aum := nl_jnum(r->'aum');
      v_founded := coalesce(nl_jnum(r->'year_founded')::int, extract(year from nl_jdate(r->'established_date'))::int);
      insert into nl_lead_pool_firms as p (crd, name, alt_names, firm_type, size_tier, signal, signal_date, city, state, zip, address,
          main_phone, general_email, website, linkedin_url, facebook_url, x_url, aum, aum_growth_1y_pct, aum_growth_3y_pct,
          employees, total_reps, advisory_clients, avg_account_size, fee_structures, client_personas, services, crm_tags,
          technology_tags, custodians, year_founded, team_avg_age, description, import_batch_id, extra)
      values (v_crd, trim(r->>'name'), nl_jtext_array(r->'alt_names'), v_type,
          case when v_aum is null then null when v_aum < 100000000 then 'small' when v_aum < 1000000000 then 'mid' else 'large' end,
          case when v_founded >= extract(year from now())::int - 1 then 'new_firm' end,
          case when v_founded >= extract(year from now())::int - 1 then make_date(v_founded,1,1) end,
          initcap(nullif(r->>'city','')), upper(nullif(r->>'state','')), nullif(r->>'zip',''), nullif(r->>'address',''),
          nl_phone10(r->>'main_phone'), nullif(r->>'general_email',''), nullif(r->>'website',''),
          nullif(r->>'linkedin_url',''), nullif(r->>'facebook_url',''), nullif(r->>'x_url',''),
          v_aum, nl_jnum(r->'aum_growth_1y_pct'), nl_jnum(r->'aum_growth_3y_pct'),
          nl_jnum(r->'employees')::int, nl_jnum(r->'total_reps')::int, nl_jnum(r->'advisory_clients')::int, nl_jnum(r->'avg_account_size'),
          nl_jtext_array(r->'fee_structures'), nl_jtext_array(r->'client_personas'), nl_jtext_array(r->'services'),
          nl_jtext_array(r->'crm_tags'), nl_jtext_array(r->'technology_tags'), nl_jtext_array(r->'custodians'),
          v_founded, nl_jnum(r->'team_avg_age'), nullif(r->>'description',''), b, coalesce(r->'extra','{}'::jsonb))
      on conflict (crd) do update set
          name = excluded.name, alt_names = coalesce(excluded.alt_names, p.alt_names),
          firm_type = coalesce(excluded.firm_type, p.firm_type), size_tier = coalesce(excluded.size_tier, p.size_tier),
          signal = coalesce(p.signal, excluded.signal), signal_date = coalesce(p.signal_date, excluded.signal_date),
          city = coalesce(excluded.city, p.city), state = coalesce(excluded.state, p.state), zip = coalesce(excluded.zip, p.zip),
          address = coalesce(excluded.address, p.address), main_phone = coalesce(excluded.main_phone, p.main_phone),
          general_email = coalesce(excluded.general_email, p.general_email), website = coalesce(excluded.website, p.website),
          linkedin_url = coalesce(excluded.linkedin_url, p.linkedin_url), facebook_url = coalesce(excluded.facebook_url, p.facebook_url),
          x_url = coalesce(excluded.x_url, p.x_url), aum = coalesce(excluded.aum, p.aum),
          aum_growth_1y_pct = coalesce(excluded.aum_growth_1y_pct, p.aum_growth_1y_pct), aum_growth_3y_pct = coalesce(excluded.aum_growth_3y_pct, p.aum_growth_3y_pct),
          employees = coalesce(excluded.employees, p.employees), total_reps = coalesce(excluded.total_reps, p.total_reps),
          advisory_clients = coalesce(excluded.advisory_clients, p.advisory_clients), avg_account_size = coalesce(excluded.avg_account_size, p.avg_account_size),
          fee_structures = coalesce(excluded.fee_structures, p.fee_structures), client_personas = coalesce(excluded.client_personas, p.client_personas),
          services = coalesce(excluded.services, p.services), crm_tags = coalesce(excluded.crm_tags, p.crm_tags),
          technology_tags = coalesce(excluded.technology_tags, p.technology_tags), custodians = coalesce(excluded.custodians, p.custodians),
          year_founded = coalesce(excluded.year_founded, p.year_founded), team_avg_age = coalesce(excluded.team_avg_age, p.team_avg_age),
          description = coalesce(excluded.description, p.description), extra = p.extra || excluded.extra, updated_at = now()
      returning (xmax = 0) into ins;
      if ins then added := added + 1; else updated := updated + 1; end if;

    elsif _kind = 'people' then
      v_crd := nullif(trim(coalesce(r->>'firm_crd', r->>'ria_firm_crd', r->>'bd_firm_crd')), '');
      if v_crd is null or coalesce(trim(coalesce(r->>'full_name', concat_ws(' ', r->>'first_name', r->>'last_name'))),'') = '' then
        skipped := skipped + 1; continue; end if;
      select id into fid from nl_lead_pool_firms where crd = v_crd;
      if fid is null then
        if coalesce(trim(r->>'firm_name'),'') = '' then skipped := skipped + 1; continue; end if;
        insert into nl_lead_pool_firms (crd, name, city, state, firm_type, import_batch_id)
        values (v_crd, trim(r->>'firm_name'), initcap(nullif(r->>'firm_city','')), upper(nullif(r->>'firm_state','')),
          case when nl_jbool(r->'is_advisor') and nl_jbool(r->'is_broker') then 'hybrid'
               when nl_jbool(r->'is_broker') then 'independent_advisor' when nl_jbool(r->'is_advisor') then 'ria' end, b)
        returning id into fid;
        added := added + 1;
      end if;
      v_title := nullif(r->>'title','');
      v_owner := coalesce(nl_jbool(r->'is_owner'), false);
      v_break := nl_jdate(r->'breakaway_date');
      insert into nl_lead_pool_contacts as c (firm_id, individual_crd, full_name, first_name, last_name, title, titles, is_owner,
          is_advisor, is_broker, phone, mobile_phone, landline_phone, email, personal_email, linkedin_url, years_experience, est_age,
          designations, prior_firm, breakaway_date, job_start_date, hobbies, education, disclosure_count, rank, extra)
      values (fid, nullif(trim(r->>'individual_crd'),''),
          trim(coalesce(nullif(r->>'full_name',''), concat_ws(' ', r->>'first_name', r->>'last_name'))),
          nullif(r->>'first_name',''), nullif(r->>'last_name',''), v_title, nl_jtext_array(r->'titles'), v_owner,
          nl_jbool(r->'is_advisor'), nl_jbool(r->'is_broker'), nl_phone10(r->>'phone'), nl_phone10(r->>'mobile_phone'),
          nl_phone10(r->>'landline_phone'), nullif(r->>'email',''), nullif(r->>'personal_email',''), nullif(r->>'linkedin_url',''),
          nl_jnum(r->'years_experience')::int, nl_jnum(r->'est_age')::int, nl_jtext_array(r->'designations'),
          nullif(r->>'prior_firm',''), v_break, nl_jdate(r->'job_start_date'), nl_jtext_array(r->'hobbies'),
          nl_jtext_array(r->'education'), nl_jnum(r->'disclosure_count')::int,
          nl_contact_rank(v_owner, coalesce(v_title, array_to_string(nl_jtext_array(r->'titles'), ' '))), coalesce(r->'extra','{}'::jsonb))
      on conflict (firm_id, individual_crd) where individual_crd is not null do update set
          full_name = excluded.full_name, title = coalesce(excluded.title, c.title), titles = coalesce(excluded.titles, c.titles),
          is_owner = excluded.is_owner or c.is_owner, phone = coalesce(excluded.phone, c.phone),
          mobile_phone = coalesce(excluded.mobile_phone, c.mobile_phone), landline_phone = coalesce(excluded.landline_phone, c.landline_phone),
          email = coalesce(excluded.email, c.email), linkedin_url = coalesce(excluded.linkedin_url, c.linkedin_url),
          breakaway_date = coalesce(excluded.breakaway_date, c.breakaway_date), rank = least(excluded.rank, c.rank), updated_at = now();
      contacts := contacts + 1;
      if v_break is not null and v_break >= current_date - 548 then
        update nl_lead_pool_firms set signal = 'breakaway', signal_date = v_break, updated_at = now()
        where id = fid and (signal is null or signal_date < v_break);
      end if;
    else
      raise exception 'Unknown export kind %', _kind;
    end if;
  end loop;

  update nl_lead_import_batches set firms_added = added, firms_updated = updated, contacts_added = contacts, rows_skipped = skipped where id = b;
  return jsonb_build_object('batch_id', b, 'firms_added', added, 'firms_updated', updated, 'contacts', contacts, 'skipped', skipped);
end $function$
;

CREATE OR REPLACE FUNCTION public.nl_pool_my_availability()
 RETURNS TABLE(state text, city text, available integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select t.state, t.city,
    (select count(*)::int from nl_lead_pool_firms f
      where f.status='available' and upper(f.state)=upper(t.state)
        and (t.city is null or upper(f.city)=upper(t.city))) as available
  from nl_lead_territories t
  where t.rep_user_id = auth.uid() and coalesce(t.active,true)
  order by t.state, t.city nulls first;
$function$
;

CREATE OR REPLACE FUNCTION public.nl_pool_pull(_state text, _city text DEFAULT NULL::text, _firm_type text DEFAULT 'any'::text, _count integer DEFAULT 50)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Not signed in'; end if;
  if _city is null then
    if not exists (select 1 from public.nl_lead_territories t where t.rep_user_id = me and t.active
                   and upper(t.state) = upper(_state) and t.city is null) then
      raise exception 'Pick one of your cities in this state';
    end if;
  elsif not exists (select 1 from public.nl_lead_territories t where t.rep_user_id = me and t.active
                    and upper(t.state) = upper(_state) and (t.city is null or upper(t.city) = upper(_city))) then
    raise exception 'That area is not in your territory';
  end if;
  return public.nl_pool_claim_for(me, _state, _city, _firm_type, least(coalesce(_count, 50), 300));
end $function$
;

CREATE OR REPLACE FUNCTION public.nl_pool_recycle()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare a int; b int; c int; d int; e int; f int;
begin
  -- 1. Warm/hot/won leads are converted and leave the pool for good
  update nl_lead_pool_firms p set status='converted', updated_at=now()
  from nl_bdr_leads l where l.id=p.lead_id and p.status in ('claimed','cooldown')
    and (l.pipeline_stage in ('warm','hot','won') or exists(select 1 from bdr_call_outcomes o where o.lead_id=l.id and o.outcome='Won')
         or exists(select 1 from bdr_calendar_events ev where ev.lead_id=l.id and ev.meeting_kind in ('discovery','closing','onboarding')));
  get diagnostics c = row_count;

  -- 2. Claimed 3+ days, never touched -> straight back to the pool
  with idle as (
    select p.id, p.lead_id from nl_lead_pool_firms p join nl_bdr_leads l on l.id=p.lead_id
    where p.status='claimed' and p.claimed_at < now()-interval '3 days'
      and not exists (select 1 from nl_lead_call_log g where g.lead_id=p.lead_id)
      and coalesce(l.called,false)=false and coalesce(l.pipeline_stage,'cold')='cold'
      and jsonb_array_length(coalesce(l.outcome_history,'[]'::jsonb))=0
  ), del as (delete from nl_bdr_leads l using idle where l.id=idle.lead_id returning idle.id)
  update nl_lead_pool_firms p set status='available', previous_owner_ids=array_append(previous_owner_ids, owner_rep_id),
     owner_rep_id=null, lead_id=null, claimed_at=null, updated_at=now()
  from del where p.id=del.id;
  get diagnostics a = row_count;

  -- 3. Business closed -> permanently out
  update nl_lead_pool_firms p set status='disqualified', updated_at=now()
  from nl_bdr_leads l where l.id=p.lead_id and p.status='claimed'
    and (l.outcome_history->-1->>'label') = 'Business Closed';

  -- 4. Every number at the firm is do-not-call -> permanently out
  update nl_lead_pool_firms p set status='dnc', updated_at=now()
  where p.status='claimed'
    and (p.main_phone is null or exists(select 1 from nl_dnc_numbers n where n.phone_normalized=nl_phone10(p.main_phone)))
    and not exists (select 1 from nl_lead_pool_contacts k where k.firm_id=p.id and not k.do_not_call
         and exists (select 1 from unnest(array[k.mobile_phone,k.landline_phone,k.phone]) ph where ph is not null
                     and not exists (select 1 from nl_dnc_numbers n where n.phone_normalized=nl_phone10(ph))))
    and exists (select 1 from nl_dnc_numbers n where n.contact_id in (select id from nl_lead_pool_contacts where firm_id=p.id)
                or n.phone_normalized=nl_phone10(p.main_phone));

  -- 5. Not interested (still cold) -> rest 180 days, then a different rep
  update nl_lead_pool_firms p set status='cooldown', cooldown_until=now()+interval '180 days', updated_at=now()
  from nl_bdr_leads l where l.id=p.lead_id and p.status='claimed' and coalesce(l.pipeline_stage,'cold')='cold'
    and (l.status='closed_lost'
         or (select g.outcome from nl_lead_call_log g where g.lead_id=l.id and g.outcome is not null order by g.called_at desc limit 1)='Not interested'
         or (select o.outcome from bdr_call_outcomes o where o.lead_id=l.id order by o.logged_at desc limit 1)
            in ('Lost','Not Interested','Don''t See the Value','Already Have Someone','In-House Team','Bad Experience'));
  get diagnostics d = row_count;

  -- 6. 6+ calls with no real conversation (still cold) -> rest 60 days, then a different rep
  update nl_lead_pool_firms p set status='cooldown', cooldown_until=now()+interval '60 days', updated_at=now()
  from nl_bdr_leads l where l.id=p.lead_id and p.status='claimed' and coalesce(l.pipeline_stage,'cold')='cold'
    and greatest((select count(*) from nl_lead_call_log g where g.lead_id=l.id),(select count(*) from nl_bdr_dial_log dl where dl.lead_id=l.id)) >= 6
    and not exists (select 1 from nl_lead_call_log g where g.lead_id=l.id and g.outcome in ('Talked','Callback','Booked','Not interested'))
    and not exists (select 1 from bdr_call_outcomes o where o.lead_id=l.id and o.outcome not in ('Didn''t Answer','Gatekeeper','Didn''t Get Past Gatekeeper'))
    and (l.callback_at is null or l.callback_at < now());
  get diagnostics e = row_count;

  -- 7. Rest is over -> remove the old rep's copy (if still cold) and reopen for someone else
  with done as (select id, lead_id, owner_rep_id from nl_lead_pool_firms where status='cooldown' and cooldown_until <= now()),
  del as (delete from nl_bdr_leads l using done where l.id=done.lead_id and coalesce(l.pipeline_stage,'cold')='cold'
     and not exists (select 1 from bdr_calendar_events ev where ev.lead_id=l.id and ev.meeting_kind is not null)
     and not exists (select 1 from bdr_meeting_outcomes mo where mo.lead_id=l.id) returning l.id)
  update nl_lead_pool_firms p set status='available', cooldown_until=null,
     previous_owner_ids = case when done.owner_rep_id is null then previous_owner_ids else array_append(previous_owner_ids, done.owner_rep_id) end,
     owner_rep_id=null, lead_id=null, claimed_at=null, recycle_count=coalesce(recycle_count,0)+1, attempt_count=0, updated_at=now()
  from done where p.id=done.id;
  get diagnostics b = row_count;

  return jsonb_build_object('converted',c,'released_idle',a,'not_interested_rest',d,'no_contact_rest',e,'reopened',b);
end $function$
;

CREATE OR REPLACE FUNCTION public.nl_pool_stats()
 RETURNS TABLE(state text, available integer, claimed integer, resting integer, converted integer, removed integer, total integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not private.is_admin_or_operator(auth.uid()) then raise exception 'Admins only'; end if;
  return query
  select coalesce(upper(f.state),'—'),
    count(*) filter (where f.status='available')::int,
    count(*) filter (where f.status='claimed')::int,
    count(*) filter (where f.status='cooldown')::int,
    count(*) filter (where f.status='converted')::int,
    count(*) filter (where f.status in ('dnc','disqualified'))::int,
    count(*)::int
  from nl_lead_pool_firms f group by 1 order by 1;
end $function$
;

CREATE OR REPLACE FUNCTION public.nl_update_call(_call_id uuid, _outcome text, _notes text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update nl_lead_call_log set outcome=nullif(_outcome,''), notes=coalesce(nullif(_notes,''),notes)
  where id=_call_id and (user_id=auth.uid() or private.is_admin_or_operator(auth.uid()));
  if not found then raise exception 'Call not found'; end if;
end $function$
;

CREATE OR REPLACE FUNCTION public.trigger_booking_confirmation_sms()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.source = 'booking_form' AND coalesce(NEW.reschedule_count,0) = 0 THEN
    PERFORM net.http_post(
      url := 'https://irvrmkshjcyabjubihmp.supabase.co/functions/v1/booking-confirmation-sms',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlydnJta3NoamN5YWJqdWJpaG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNDgxMTYsImV4cCI6MjA4ODkyNDExNn0.LHyFEq1NAKEI31D0C91y9JsuFam4HaEUUYMU6VjIe0A',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlydnJta3NoamN5YWJqdWJpaG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNDgxMTYsImV4cCI6MjA4ODkyNDExNn0.LHyFEq1NAKEI31D0C91y9JsuFam4HaEUUYMU6VjIe0A'
      ),
      body := jsonb_build_object('type','INSERT','table','bdr_calendar_events','record', row_to_json(NEW))
    );
  END IF;
  RETURN NEW;
END;
$function$
;

-- Access
revoke all on function public.nl_pool_claim_for(uuid, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.nl_pool_import(text, jsonb, text) from public, anon;
grant execute on function public.nl_pool_import(text, jsonb, text) to authenticated;
revoke all on function public.nl_pool_pull(text, text, text, integer), public.nl_pool_assign(uuid, text, text, text, integer),
  public.nl_dialer_lead_details(uuid[]), public.nl_log_call(uuid, uuid, text, text, text, text), public.nl_update_call(uuid, text, text),
  public.nl_mark_dnc(text, uuid, text), public.nl_pool_my_availability(), public.nl_pool_stats(),
  public.nl_meeting_effort(timestamptz, uuid) from public, anon;
grant execute on function public.nl_pool_pull(text, text, text, integer), public.nl_pool_assign(uuid, text, text, text, integer),
  public.nl_dialer_lead_details(uuid[]), public.nl_log_call(uuid, uuid, text, text, text, text), public.nl_update_call(uuid, text, text),
  public.nl_mark_dnc(text, uuid, text), public.nl_pool_my_availability(), public.nl_pool_stats(),
  public.nl_meeting_effort(timestamptz, uuid) to authenticated;

-- Daily pool recycle (03:15 PT). Re-scheduling by name is safe.
select cron.schedule('nl-lead-pool-recycle', '15 10 * * *', 'select public.nl_pool_recycle();');
