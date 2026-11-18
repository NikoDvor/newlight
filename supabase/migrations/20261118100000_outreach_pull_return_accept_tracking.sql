-- Mirrors changes applied live to the database (Nov 2026): outreach pull/return, template rates,
-- Form 1 rule, lead-delete cleanup, LinkedIn accept tracking, booking source tagging.
-- Idempotent (create or replace / if not exists).

alter table public.nl_text_leads add column if not exists li_accepted_at timestamptz;
alter table public.nl_bdr_leads add column if not exists outreach_channel text;
alter table public.nl_bdr_leads add column if not exists outreach_template_id uuid;

alter table public.nl_text_leads enable row level security;

create or replace function public.nl_is_form1(_src text, _resched integer, _att text)
returns boolean language sql immutable as $function$
  select coalesce(_src,'') in ('booking_form','round_robin','external_booking') and coalesce(_resched,0) = 0 and coalesce(_att,'') not in ('rescheduled','cancelled')
$function$;

create or replace function public.nl_lead_delete_cleanup()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  update bdr_calendar_events set attendance = 'cancelled', updated_at = now()
   where lead_id = old.id and meeting_kind is not null and coalesce(attendance,'') not in ('cancelled');
  delete from bdr_calendar_events where lead_id = old.id and source = 'dialer' and meeting_kind is null;
  return old;
end $function$;

drop trigger if exists nl_lead_delete_cleanup_trg on public.nl_bdr_leads;
create trigger nl_lead_delete_cleanup_trg after delete on public.nl_bdr_leads for each row execute function public.nl_lead_delete_cleanup();

create or replace function public.nl_rep_scorecard(p_user uuid default auth.uid(), p_days integer default 1)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare since timestamptz; r jsonb;
begin
  if p_user is distinct from auth.uid() and not private.is_admin_or_operator(auth.uid()) then
    raise exception 'Not allowed';
  end if;
  since := case when p_days <= 1 then date_trunc('day', now() at time zone 'America/Los_Angeles') at time zone 'America/Los_Angeles'
                else now() - make_interval(days => p_days) end;
  select jsonb_build_object(
    'dials',    (select count(*) from nl_bdr_dial_log d where d.bdr_user_id = p_user and d.dialed_at >= since),
    'booked',   (select count(*) from bdr_calendar_events e where e.user_id = p_user and coalesce(e.is_extra,false) = false and e.lead_id is not null and public.nl_is_form1(e.source, e.reschedule_count, e.attendance) and e.created_at >= since),
    'held',     (select count(*) from bdr_calendar_events e where e.user_id = p_user and e.attendance = 'attended' and e.starts_at >= since),
    'no_shows', (select count(*) from bdr_calendar_events e where e.user_id = p_user and e.attendance = 'no_show' and e.starts_at >= since),
    'closed',   (select count(*) from crm_deals c where c.assigned_user = p_user and c.pipeline_stage = 'closed_won' and coalesce(c.close_date::timestamptz, c.paid_signed_at, c.updated_at) >= since)
  ) into r;
  return r;
end $function$;

create or replace function public.nl_template_rates()
returns table(template_id uuid, sent bigint, replied bigint, booked bigint)
language plpgsql stable security definer set search_path to 'public' as $function$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  return query
  select t.id,
         count(s.id) filter (where s.sent_at <= now()),
         count(distinct s.text_lead_id) filter (where l.result in ('replied','booked','lost','stop')),
         count(distinct s.text_lead_id) filter (where l.result = 'booked')
  from nl_text_templates t
  left join nl_text_sends s on s.template_id = t.id
  left join nl_text_leads l on l.id = s.text_lead_id
  where t.active
  group by t.id;
end $function$;

drop function if exists public.nl_text_pull(integer, text, text);
create or replace function public.nl_text_pull(_count integer default 40, _state text default null, _channel text default 'text', _source text default 'pool', _lead_id uuid default null)
returns integer language plpgsql security definer set search_path to 'public' as $function$
declare _uid uuid := auth.uid(); n int := 0; r record; new_id uuid;
  li boolean := (_channel = 'linkedin'); bo boolean := (_channel = 'both');
begin
  if _uid is null then raise exception 'Not signed in'; end if;
  if _channel not in ('text','linkedin','both') then raise exception 'Bad channel'; end if;
  perform public.nl_contractor_assert_can_sell(_uid);
  _count := least(greatest(coalesce(_count, 40), 1), 150);
  if _lead_id is not null then _count := 1; end if;
  for r in
    select * from (
      select distinct on (f.id) f.id firm_id, f.name firm_name, f.city, f.state, f.aum, f.signal, f.firm_type, f.created_at fca,
             c.id contact_id, c.full_name, coalesce(nl_first_name(c.first_name), nl_first_name(c.full_name)) first_name, c.linkedin_url,
             coalesce(c.mobile_phone, c.phone, c.landline_phone) ph
      from nl_lead_pool_firms f
      join nl_lead_pool_contacts c on c.firm_id = f.id
      where coalesce(f.status,'') <> 'disqualified'
        and (_state is null or upper(f.state) = upper(_state))
        and not c.do_not_call
        and ( (li and coalesce(trim(c.linkedin_url),'') <> '')
           or (not li and (not bo or coalesce(trim(c.linkedin_url),'') <> '')
               and length(coalesce(nl_phone10(coalesce(c.mobile_phone, c.phone, c.landline_phone)), '')) = 10
               and not exists (select 1 from nl_dnc_numbers d where d.phone_normalized = nl_phone10(coalesce(c.mobile_phone, c.phone, c.landline_phone)))
               and not exists (select 1 from nl_text_leads t where t.phone is not null and nl_phone10(t.phone) = nl_phone10(coalesce(c.mobile_phone, c.phone, c.landline_phone)))) )
        and not exists (select 1 from nl_text_leads t where t.contact_id = c.id)
        and not exists (select 1 from nl_text_leads t where t.pool_firm_id = f.id
              and (t.text_status = 'new' or (t.text_sent_at at time zone 'America/Los_Angeles')::date = (now() at time zone 'America/Los_Angeles')::date))
        and not exists (select 1 from nl_text_leads t where t.pool_firm_id = f.id and (t.result = 'closed' or t.outcome in ('Won','Lost')))
        and not exists (select 1 from nl_bdr_leads l where l.pool_firm_id = f.id and (l.pipeline_stage = 'won' or l.closed_out_at is not null))
        and not exists (select 1 from nl_bdr_leads l join bdr_call_outcomes o on o.lead_id = l.id where l.pool_firm_id = f.id and o.outcome in ('Won','Lost'))
        and not exists (select 1 from nl_bdr_leads l join bdr_calendar_events e on e.lead_id = l.id where l.pool_firm_id = f.id and e.meeting_kind is not null and coalesce(e.attendance,'pending') in ('pending','attended'))
        and (_source <> 'dialer' or exists (select 1 from nl_bdr_leads l where l.pool_firm_id = f.id and l.user_id = _uid))
        and (_lead_id is null or exists (select 1 from nl_bdr_leads l where l.id = _lead_id and l.pool_firm_id = f.id and l.user_id = _uid))
      order by f.id, c.is_owner desc nulls last, c.rank, c.created_at
    ) x
    order by (signal is not null) desc,
             case firm_type when 'ria' then 1 when 'ibd' then 2 when 'hybrid' then 3 when 'independent_advisor' then 4 else 5 end, fca
    limit _count
  loop
    insert into nl_text_leads (rep_user_id, contact_id, pool_firm_id, firm_name, contact_name, first_name, phone, linkedin_url, city, state, aum, signal)
    values (_uid, r.contact_id, r.firm_id, r.firm_name, r.full_name, r.first_name, case when li then null else r.ph end, nullif(trim(r.linkedin_url), ''), r.city, upper(r.state), r.aum, r.signal)
    on conflict (contact_id) do nothing returning id into new_id;
    if new_id is not null then n := n + 1; new_id := null; end if;
  end loop;
  return n;
end $function$;

create or replace function public.nl_text_return(_ids uuid[] default null)
returns integer language plpgsql security definer set search_path to 'public' as $function$
declare _uid uuid := auth.uid(); n int;
begin
  if _uid is null then raise exception 'Not signed in'; end if;
  delete from nl_text_leads t
  where t.rep_user_id = _uid and t.contact_id is not null
    and t.text_status = 'new' and t.li_status = 'new' and t.result is null and t.outcome is null and t.lead_id is null
    and not exists (select 1 from nl_text_sends s where s.text_lead_id = t.id)
    and (_ids is null or t.id = any(_ids));
  get diagnostics n = row_count;
  return n;
end $function$;

create or replace function public.nl_text_li_accept(_id uuid, _undo boolean default false)
returns void language plpgsql security definer set search_path to 'public' as $function$
begin
  update nl_text_leads set li_status = case when _undo then 'requested' else 'accepted' end,
    li_accepted_at = case when _undo then null else now() end
  where id = _id and rep_user_id = auth.uid() and li_status = case when _undo then 'accepted' else 'requested' end;
  if not found then raise exception 'Nothing to change'; end if;
end $function$;

create or replace function public.nl_text_li_accept_many(_ids uuid[])
returns integer language plpgsql security definer set search_path to 'public' as $function$
declare n int;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  update nl_text_leads set li_status = 'accepted', li_accepted_at = now()
  where id = any(_ids) and rep_user_id = auth.uid() and li_status = 'requested';
  get diagnostics n = row_count;
  return n;
end $function$;

create or replace function public.nl_text_send(_id uuid, _channel text, _when timestamptz default null, _template uuid default null, _body text default null)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare _uid uuid := auth.uid(); t nl_text_leads; w timestamptz := coalesce(_when, now()); caps record; used int; cap int;
begin
  select * into t from nl_text_leads where id = _id and rep_user_id = _uid;
  if not found then raise exception 'Not your lead'; end if;
  if _channel not in ('text','li_connect','li_message') then raise exception 'Bad channel'; end if;
  if t.result = 'closed' then raise exception 'This firm was already closed (won or lost) on another lead'; end if;
  if t.pool_firm_id is not null and exists (select 1 from nl_bdr_leads l join bdr_calendar_events e on e.lead_id = l.id where l.pool_firm_id = t.pool_firm_id and e.meeting_kind is not null and coalesce(e.attendance,'pending') in ('pending','attended')) then raise exception 'This firm already has a meeting booked'; end if;
  if t.result in ('stop','wrong_number') and _channel = 'text' then raise exception 'This lead asked to stop or has a wrong number'; end if;
  select * into caps from nl_text_caps(_uid);
  cap := case _channel when 'text' then caps.text_cap when 'li_connect' then caps.li_request_cap else caps.li_message_cap end;
  select count(*) into used from nl_text_sends s where s.rep_user_id = _uid and s.channel = _channel
    and (s.sent_at at time zone 'America/Los_Angeles')::date = (w at time zone 'America/Los_Angeles')::date;
  if used >= cap then raise exception 'Daily limit reached for that day (% a day)', cap; end if;
  insert into nl_text_sends (rep_user_id, text_lead_id, channel, template_id, body, sent_at) values (_uid, _id, _channel, _template, _body, w);
  if _channel = 'text' then
    update nl_text_leads set text_status = 'sent', text_sent_at = w, text_template_id = _template where id = _id;
  else
    update nl_text_leads set li_status = case _channel when 'li_connect' then 'requested' else 'sent' end, li_sent_at = w,
      li_accepted_at = case when _channel = 'li_message' then coalesce(li_accepted_at, w) else li_accepted_at end where id = _id;
  end if;
end $function$;

create or replace function public.nl_text_book(_id uuid)
returns uuid language plpgsql security definer set search_path to 'public' as $function$
declare _uid uuid := auth.uid(); t nl_text_leads; f nl_lead_pool_firms; lid uuid; lc text; lt uuid;
  internal constant uuid := '00000000-0000-0000-0000-0000000000ff';
begin
  select * into t from nl_text_leads where id = _id and rep_user_id = _uid;
  if not found then raise exception 'Not your lead'; end if;
  if t.lead_id is not null then return t.lead_id; end if;
  select case when s.channel = 'text' then 'text' else 'linkedin' end, s.template_id into lc, lt
    from nl_text_sends s where s.text_lead_id = _id and s.sent_at <= now() order by s.sent_at desc limit 1;
  if t.pool_firm_id is not null then select id into lid from nl_bdr_leads where user_id = _uid and pool_firm_id = t.pool_firm_id limit 1; end if;
  if lid is null and t.pool_firm_id is null then
    insert into nl_bdr_leads (user_id, client_id, business_name, owner_name, city, state, lead_source, list_name, pipeline_stage, notes)
    values (_uid, internal, t.firm_name, t.contact_name, t.city, upper(t.state), 'linkedin', 'LinkedIn import', 'cold', 'LinkedIn: ' || coalesce(t.linkedin_url, '')) returning id into lid;
  elsif lid is null then
    select * into f from nl_lead_pool_firms where id = t.pool_firm_id;
    begin
      insert into nl_bdr_leads (user_id, client_id, business_name, owner_name, phone, front_desk_phone, owner_direct_phone, website, niche, city, state, crd, lead_source, list_name, pipeline_stage, pool_firm_id)
      values (_uid, internal, f.name, t.contact_name, f.main_phone, f.main_phone, t.phone, f.website, nl_niche_label(f.firm_type), f.city, upper(f.state), f.crd, 'advizorpro',
              'Text · ' || coalesce(nullif(initcap(f.city), '') || ', ' || upper(f.state), 'Pool'), 'cold', f.id) returning id into lid;
    exception when unique_violation then
      insert into nl_bdr_leads (user_id, client_id, business_name, owner_name, website, niche, city, state, crd, lead_source, list_name, pipeline_stage, pool_firm_id, notes)
      values (_uid, internal, f.name, t.contact_name, f.website, nl_niche_label(f.firm_type), f.city, upper(f.state), f.crd, 'advizorpro',
              'Text · ' || coalesce(nullif(initcap(f.city), '') || ', ' || upper(f.state), 'Pool'), 'cold', f.id, 'Phone shared with another lead — from text outreach.') returning id into lid;
    end;
  end if;
  update nl_bdr_leads set outreach_channel = coalesce(lc, outreach_channel), outreach_template_id = coalesce(lt, outreach_template_id) where id = lid;
  update nl_text_leads set lead_id = lid, result = 'booked', outcome_at = now() where id = _id;
  if t.pool_firm_id is not null then
    update nl_bdr_leads set closed_out_at = now(), closed_out_reason = 'Booked by text outreach'
    where pool_firm_id = t.pool_firm_id and closed_out_at is null and id <> lid;
    update nl_text_leads set result = 'closed', outcome = 'Closed: booked on another lead', outcome_at = now()
    where pool_firm_id = t.pool_firm_id and id <> t.id and result is null;
  end if;
  return lid;
end $function$;

create or replace function public.nl_text_stats(_since timestamptz default (now() - interval '30 days'))
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare _out jsonb;
begin
  if not private.is_admin_or_operator(auth.uid()) then raise exception 'Admins only'; end if;
  select jsonb_build_object(
    'reps', coalesce((select jsonb_agg(x order by x->>'name') from (
      select jsonb_build_object('rep_user_id', s.rep_user_id, 'name', coalesce(e.full_name, 'Unknown'),
        'texts', count(*) filter (where s.channel = 'text' and s.sent_at <= now()),
        'li_requests', count(*) filter (where s.channel = 'li_connect' and s.sent_at <= now()),
        'li_accepted', count(distinct s.text_lead_id) filter (where s.channel = 'li_connect' and l.li_accepted_at is not null),
        'li_stale', count(distinct s.text_lead_id) filter (where s.channel = 'li_connect' and l.li_status = 'requested' and s.sent_at < now() - interval '21 days'),
        'li_messages', count(*) filter (where s.channel = 'li_message' and s.sent_at <= now()),
        'scheduled', count(*) filter (where s.sent_at > now()),
        'replied', count(distinct s.text_lead_id) filter (where l.result in ('replied','booked','lost','stop')),
        'interested', count(distinct s.text_lead_id) filter (where l.result in ('replied','booked')),
        'booked', count(distinct s.text_lead_id) filter (where l.result = 'booked'),
        'won', count(distinct s.text_lead_id) filter (where b.pipeline_stage = 'won'),
        'leads_touched', count(distinct s.text_lead_id)) x
      from nl_text_sends s join nl_text_leads l on l.id = s.text_lead_id
      left join nl_bdr_leads b on b.id = l.lead_id
      left join employee_profiles e on e.user_id = s.rep_user_id
      where s.sent_at >= _since group by s.rep_user_id, e.full_name) q), '[]'::jsonb),
    'templates', coalesce((select jsonb_agg(x order by x->>'channel', x->>'name') from (
      select jsonb_build_object('id', t.id, 'name', t.name, 'channel', t.channel, 'active', t.active,
        'sent', count(s.id) filter (where s.sent_at <= now()),
        'replied', count(distinct s.text_lead_id) filter (where l.result in ('replied','booked','lost','stop')),
        'interested', count(distinct s.text_lead_id) filter (where l.result in ('replied','booked')),
        'booked', count(distinct s.text_lead_id) filter (where l.result = 'booked'),
        'won', count(distinct s.text_lead_id) filter (where b.pipeline_stage = 'won'),
        'outcomes', coalesce((select jsonb_object_agg(o.outcome, o.n) from (
            select l2.outcome, count(distinct l2.id) n
            from nl_text_sends s2 join nl_text_leads l2 on l2.id = s2.text_lead_id
            where s2.template_id = t.id and s2.sent_at >= _since and l2.outcome is not null
              and l2.outcome_channel = case when t.channel = 'text' then 'text' else 'linkedin' end
            group by l2.outcome) o), '{}'::jsonb)) x
      from nl_text_templates t left join nl_text_sends s on s.template_id = t.id and s.sent_at >= _since
      left join nl_text_leads l on l.id = s.text_lead_id
      left join nl_bdr_leads b on b.id = l.lead_id
      group by t.id) q), '[]'::jsonb),
    'outcomes', coalesce((select jsonb_object_agg(outcome, n) from (select outcome, count(*) n from nl_text_outcomes where logged_at >= _since group by 1) q), '{}'::jsonb)
  ) into _out;
  return _out;
end $function$;

grant execute on function public.nl_text_pull(integer, text, text, text, uuid) to authenticated;
grant execute on function public.nl_text_return(uuid[]) to authenticated;
grant execute on function public.nl_text_li_accept_many(uuid[]) to authenticated;

-- One-off cleanup already applied live: the 16 nl_training_*backup*/bak tables were dropped.
