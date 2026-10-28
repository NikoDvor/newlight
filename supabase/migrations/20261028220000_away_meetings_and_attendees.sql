-- Away-from-Zoom meetings + extra meeting attendees (Oct 28, 2026).
--
-- 1. bdr_calendar_events.is_external — "meeting away from our Zoom" (in person,
--    phone, the client's own calendar). No Zoom link, no client/attendee emails,
--    texts or reminders. Everything else (calendar, meeting number, outcome,
--    stats, stage rules) is identical. The salesman still gets their reminders.
-- 2. source 'external_booking' — a first meeting booked outside the app and
--    logged by the salesman. Counts as Form 1 (lead → Warm), tracked as Discovery.
-- 3. bdr_meeting_attendees — extra people on a meeting. On Zoom meetings they get
--    the same confirmation, Zoom link, reminders and reschedule notices
--    (email; texts only after they opt in from the link in their email).
-- 4. nl_log_external_first_meeting() — the "Log meeting booked elsewhere" action.
-- 5. nl_attendee_optin_info() / nl_attendee_sms_optin() — public opt-in page.

alter table public.bdr_calendar_events
  add column if not exists is_external boolean not null default false;

alter table public.bdr_calendar_events drop constraint if exists bdr_calendar_events_source_check;
alter table public.bdr_calendar_events add constraint bdr_calendar_events_source_check
  check (source = any (array['dialer','manual','booking_form','sdr_mirror','round_robin','closing_meeting',
    'onboarding_meeting','admin_weekly_recurring','service_meeting','extra_meeting','external_booking']));

create or replace function public.bdr_event_meeting_kind_from_source(_source text)
returns text language sql immutable set search_path = public as $$
  SELECT CASE
    WHEN _source IN ('booking_form','round_robin','external_booking') THEN 'discovery'
    WHEN _source = 'closing_meeting' THEN 'closing'
    WHEN _source = 'onboarding_meeting' THEN 'onboarding'
    WHEN _source IN ('service_meeting','admin_weekly_recurring') THEN 'service'
    ELSE NULL END
$$;

-- ---------------------------------------------------------------------------
-- Attendees
-- ---------------------------------------------------------------------------
create table if not exists public.bdr_meeting_attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.bdr_calendar_events(id) on delete cascade,
  lead_id uuid references public.nl_bdr_leads(id) on delete set null,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  email text check (email is null or email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  phone text check (phone is null or char_length(phone) <= 40),
  sms_consent boolean not null default false,
  sms_consent_at timestamptz,
  optin_token uuid not null default gen_random_uuid() unique,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint bdr_meeting_attendees_contact check (email is not null or phone is not null)
);
create index if not exists bdr_meeting_attendees_event_idx on public.bdr_meeting_attendees(event_id);
create index if not exists bdr_meeting_attendees_lead_idx on public.bdr_meeting_attendees(lead_id);

alter table public.bdr_meeting_attendees enable row level security;
drop policy if exists bdr_meeting_attendees_admin on public.bdr_meeting_attendees;
create policy bdr_meeting_attendees_admin on public.bdr_meeting_attendees for all to authenticated
  using (private.is_admin_or_operator(auth.uid())) with check (private.is_admin_or_operator(auth.uid()));
drop policy if exists bdr_meeting_attendees_own on public.bdr_meeting_attendees;
create policy bdr_meeting_attendees_own on public.bdr_meeting_attendees for all to authenticated
  using (exists (select 1 from public.bdr_calendar_events e where e.id = event_id and e.user_id = auth.uid()))
  with check (exists (select 1 from public.bdr_calendar_events e where e.id = event_id and e.user_id = auth.uid()));
grant select, insert, update, delete on public.bdr_meeting_attendees to authenticated;

-- Public opt-in page: read-only info for a token (no consent change on view —
-- email link scanners prefetch links, so consent needs the button click).
create or replace function public.nl_attendee_optin_info(_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'found', true,
    'name', a.name,
    'phone_last4', right(regexp_replace(coalesce(a.phone,''), '\D', '', 'g'), 4),
    'has_phone', coalesce(a.phone,'') <> '',
    'sms_consent', a.sms_consent)
  from public.bdr_meeting_attendees a where a.optin_token = _token
$$;

create or replace function public.nl_attendee_sms_optin(_token uuid, _phone text default null, _consent boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.bdr_meeting_attendees; digits text;
begin
  select * into a from public.bdr_meeting_attendees where optin_token = _token;
  if not found then return jsonb_build_object('ok', false, 'error', 'Link not found'); end if;
  if coalesce(a.phone,'') = '' then
    digits := regexp_replace(coalesce(_phone,''), '\D', '', 'g');
    if length(digits) < 10 or length(digits) > 15 then
      return jsonb_build_object('ok', false, 'error', 'Enter a valid mobile number');
    end if;
    update public.bdr_meeting_attendees set phone = left(btrim(_phone), 40) where id = a.id;
    a.phone := left(btrim(_phone), 40);
  end if;
  -- Same person on this lead's other meetings (matched by email or phone digits).
  update public.bdr_meeting_attendees b
     set sms_consent = _consent,
         sms_consent_at = case when _consent then now() else null end,
         phone = coalesce(nullif(b.phone,''), a.phone)
   where b.id = a.id
      or (a.lead_id is not null and b.lead_id = a.lead_id and (
            (a.email is not null and lower(b.email) = lower(a.email))
         or (regexp_replace(coalesce(b.phone,''), '\D', '', 'g') <> ''
             and right(regexp_replace(b.phone, '\D', '', 'g'), 10) = right(regexp_replace(a.phone, '\D', '', 'g'), 10))));
  return jsonb_build_object('ok', true, 'sms_consent', _consent);
end $$;

revoke all on function public.nl_attendee_optin_info(uuid) from public;
revoke all on function public.nl_attendee_sms_optin(uuid, text, boolean) from public;
grant execute on function public.nl_attendee_optin_info(uuid) to anon, authenticated;
grant execute on function public.nl_attendee_sms_optin(uuid, text, boolean) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- "Log meeting booked elsewhere" — first meeting booked outside the app.
-- Same effect as a Form 1 booking: lead → Warm, Discovery meeting #1 on the
-- salesman's calendar (away from Zoom: nothing is sent to the client).
-- Pass _lead_id for an existing lead, or null + _business_name for a new one.
-- ---------------------------------------------------------------------------
create or replace function public.nl_log_external_first_meeting(
  _lead_id uuid,
  _business_name text,
  _customer_name text,
  _email text,
  _phone text,
  _starts_at timestamptz,
  _duration_minutes int default 60,
  _modules text[] default null,
  _has_sales_team boolean default null,
  _sales_team_size text default null,
  _notes text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _lead public.nl_bdr_leads;
  _cal record;
  _name text := btrim(coalesce(_customer_name,''));
  _em text := lower(btrim(coalesce(_email,'')));
  _ph text := btrim(coalesce(_phone,''));
  _biz text;
  _evt uuid;
  _dur int := greatest(15, least(coalesce(_duration_minutes, 60), 480));
  _size text := case when _sales_team_size in ('1-2','3-5','6-10','10+') then _sales_team_size else null end;
  _mods text[] := (select array_agg(m) from (select m from unnest(coalesce(_modules,'{}'::text[])) m where m <> '' limit 20) x);
begin
  if _uid is null then raise exception 'Not signed in'; end if;
  if char_length(_name) < 2 or char_length(_name) > 120 then raise exception 'Client name is required'; end if;
  if _em !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'A valid client email is required'; end if;
  if length(regexp_replace(_ph, '\D', '', 'g')) < 10 then raise exception 'A valid client phone is required'; end if;
  if _starts_at is null then raise exception 'Meeting date and time are required'; end if;

  select id, client_id into _cal from public.bdr_calendars where user_id = _uid order by created_at asc limit 1;
  if _cal.id is null then raise exception 'Open your Calendar once to set it up, then try again'; end if;

  -- New client typed in: reuse this salesman's own lead with the same email/phone.
  if _lead_id is null then
    select l.id into _lead_id from public.nl_bdr_leads l
     where l.user_id = _uid
       and (lower(l.email) = _em or l.phone_normalized = right(regexp_replace(_ph, '\D', '', 'g'), 10))
     order by l.created_at asc limit 1;
  end if;

  if _lead_id is not null then
    select * into _lead from public.nl_bdr_leads where id = _lead_id;
    if not found then raise exception 'Lead not found'; end if;
    if _lead.user_id <> _uid and not private.is_admin_or_operator(_uid) then raise exception 'Not your lead'; end if;
    if exists (select 1 from public.bdr_calendar_events e where e.lead_id = _lead.id
                and e.meeting_kind = 'discovery' and coalesce(e.attendance,'pending') in ('pending','attended')) then
      raise exception 'This lead already has a first meeting — use + Meeting or Reschedule instead';
    end if;
    begin
      update public.nl_bdr_leads set
        owner_name = _name, email = _em, phone = _ph,
        modules_of_interest = coalesce(_mods, modules_of_interest),
        has_sales_team = coalesce(_has_sales_team, has_sales_team),
        sales_team_size = coalesce(_size, sales_team_size),
        estimated_annual_value = coalesce(estimated_annual_value, 34997),
        pipeline_stage = case when pipeline_stage is null or pipeline_stage in ('cold','expired_no_close_prep') then 'warm' else pipeline_stage end,
        status = case when pipeline_stage is null or pipeline_stage in ('cold','expired_no_close_prep') then 'follow_up' else status end,
        outcome_history = coalesce(outcome_history,'[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'label','First meeting booked outside the app (logged by salesman)','timestamp', now())),
        updated_at = now()
      where id = _lead.id;
    exception when unique_violation then
      -- Phone already belongs to another lead (global unique index) — keep the rest.
      update public.nl_bdr_leads set
        owner_name = _name, email = _em,
        modules_of_interest = coalesce(_mods, modules_of_interest),
        has_sales_team = coalesce(_has_sales_team, has_sales_team),
        sales_team_size = coalesce(_size, sales_team_size),
        estimated_annual_value = coalesce(estimated_annual_value, 34997),
        pipeline_stage = case when pipeline_stage is null or pipeline_stage in ('cold','expired_no_close_prep') then 'warm' else pipeline_stage end,
        status = case when pipeline_stage is null or pipeline_stage in ('cold','expired_no_close_prep') then 'follow_up' else status end,
        notes = concat_ws(E'\n', notes, 'Phone given for first meeting: ' || _ph),
        outcome_history = coalesce(outcome_history,'[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'label','First meeting booked outside the app (logged by salesman)','timestamp', now())),
        updated_at = now()
      where id = _lead.id;
    end;
    select * into _lead from public.nl_bdr_leads where id = _lead.id;
  else
    _biz := btrim(coalesce(_business_name,''));
    if _biz = '' then _biz := _name; end if;
    begin
      insert into public.nl_bdr_leads (user_id, client_id, business_name, owner_name, email, phone, lead_source, list_name,
        status, pipeline_stage, modules_of_interest, has_sales_team, sales_team_size, estimated_annual_value, notes, outcome_history)
      values (_uid, _cal.client_id, left(_biz,200), _name, _em, _ph, 'external_booking', 'Booked elsewhere',
        'follow_up', 'warm', _mods, _has_sales_team, _size, 34997, nullif(btrim(coalesce(_notes,'')),''),
        jsonb_build_array(jsonb_build_object('label','First meeting booked outside the app (logged by salesman)','timestamp', now())))
      returning * into _lead;
    exception when unique_violation then
      insert into public.nl_bdr_leads (user_id, client_id, business_name, owner_name, email, phone, lead_source, list_name,
        status, pipeline_stage, modules_of_interest, has_sales_team, sales_team_size, estimated_annual_value, notes, outcome_history)
      values (_uid, _cal.client_id, left(_biz,200), _name, _em, null, 'external_booking', 'Booked elsewhere',
        'follow_up', 'warm', _mods, _has_sales_team, _size, 34997,
        concat_ws(E'\n', nullif(btrim(coalesce(_notes,'')),''), 'Phone given for first meeting: ' || _ph),
        jsonb_build_array(jsonb_build_object('label','First meeting booked outside the app (logged by salesman)','timestamp', now())))
      returning * into _lead;
    end;
  end if;

  insert into public.bdr_calendar_events (user_id, client_id, calendar_id, lead_id, title, description, notes,
    starts_at, ends_at, stage, source, meeting_kind, is_external, attendance, metadata)
  values (_lead.user_id, coalesce(_lead.client_id, _cal.client_id),
    coalesce((select id from public.bdr_calendars where user_id = _lead.user_id order by created_at asc limit 1), _cal.id),
    _lead.id,
    'Booking: ' || _name || case when _lead.business_name is not null and _lead.business_name <> _name then ' — ' || _lead.business_name else '' end,
    nullif(btrim(coalesce(_notes,'')),''), nullif(btrim(coalesce(_notes,'')),''),
    _starts_at, _starts_at + make_interval(mins => _dur), 'warm', 'external_booking', 'discovery', true, 'pending',
    jsonb_build_object('customer_name', _name, 'business_name', _lead.business_name, 'phone', _ph, 'email', _em,
      'meeting_kind', 'discovery', 'logged_external', true, 'logged_by', _uid))
  returning id into _evt;

  return jsonb_build_object('ok', true, 'lead_id', _lead.id, 'event_id', _evt);
end $$;

revoke all on function public.nl_log_external_first_meeting(uuid,text,text,text,text,timestamptz,int,text[],boolean,text,text) from public;
grant execute on function public.nl_log_external_first_meeting(uuid,text,text,text,text,timestamptz,int,text[],boolean,text,text) to authenticated;
