-- Outreach (text + LinkedIn): manual, rep-sent. Pool pull, send log, outcomes, templates, settings.
create table if not exists public.nl_text_templates (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('text','li_connect','li_message')),
  name text not null, body text not null, active boolean not null default true, position int not null default 0,
  created_at timestamptz not null default now());
create table if not exists public.nl_text_leads (
  id uuid primary key default gen_random_uuid(),
  seq bigserial,
  rep_user_id uuid not null,
  contact_id uuid not null unique,
  pool_firm_id uuid not null,
  lead_id uuid,
  firm_name text not null, contact_name text, first_name text, phone text, linkedin_url text,
  city text, state text, aum numeric, signal text,
  text_status text not null default 'new' check (text_status in ('new','sent')),
  text_sent_at timestamptz, text_template_id uuid,
  li_status text not null default 'new' check (li_status in ('new','requested','sent')),
  li_sent_at timestamptz,
  result text, outcome text, outcome_channel text, outcome_at timestamptz,
  created_at timestamptz not null default now());
create index if not exists nl_text_leads_rep_idx on public.nl_text_leads(rep_user_id, seq);
create index if not exists nl_text_leads_firm_idx on public.nl_text_leads(pool_firm_id);
create table if not exists public.nl_text_sends (
  id uuid primary key default gen_random_uuid(),
  rep_user_id uuid not null, text_lead_id uuid not null references public.nl_text_leads(id) on delete cascade,
  channel text not null check (channel in ('text','li_connect','li_message')),
  template_id uuid, body text, sent_at timestamptz not null default now(), created_at timestamptz not null default now());
create index if not exists nl_text_sends_rep_idx on public.nl_text_sends(rep_user_id, sent_at);
create table if not exists public.nl_text_outcomes (
  id uuid primary key default gen_random_uuid(),
  rep_user_id uuid not null, text_lead_id uuid not null references public.nl_text_leads(id) on delete cascade,
  channel text not null, outcome text not null, logged_at timestamptz not null default now());
create table if not exists public.nl_text_settings (
  user_id uuid primary key, phone_type text not null default 'iphone_ios18',
  text_cap int, li_request_cap int, li_message_cap int, updated_at timestamptz not null default now());

alter table public.nl_text_templates enable row level security;
alter table public.nl_text_leads enable row level security;
alter table public.nl_text_sends enable row level security;
alter table public.nl_text_outcomes enable row level security;
alter table public.nl_text_settings enable row level security;
drop policy if exists admin_all on public.nl_text_templates; drop policy if exists read_all on public.nl_text_templates;
create policy admin_all on public.nl_text_templates for all using (private.is_admin_or_operator(auth.uid())) with check (private.is_admin_or_operator(auth.uid()));
create policy read_all on public.nl_text_templates for select to authenticated using (true);
drop policy if exists admin_all on public.nl_text_leads; drop policy if exists rep_own_read on public.nl_text_leads;
create policy admin_all on public.nl_text_leads for all using (private.is_admin_or_operator(auth.uid())) with check (private.is_admin_or_operator(auth.uid()));
create policy rep_own_read on public.nl_text_leads for select using (rep_user_id = auth.uid());
drop policy if exists admin_all on public.nl_text_sends; drop policy if exists rep_own_read on public.nl_text_sends;
create policy admin_all on public.nl_text_sends for all using (private.is_admin_or_operator(auth.uid())) with check (private.is_admin_or_operator(auth.uid()));
create policy rep_own_read on public.nl_text_sends for select using (rep_user_id = auth.uid());
drop policy if exists admin_all on public.nl_text_outcomes; drop policy if exists rep_own_read on public.nl_text_outcomes;
create policy admin_all on public.nl_text_outcomes for all using (private.is_admin_or_operator(auth.uid())) with check (private.is_admin_or_operator(auth.uid()));
create policy rep_own_read on public.nl_text_outcomes for select using (rep_user_id = auth.uid());
drop policy if exists admin_all on public.nl_text_settings; drop policy if exists own_all on public.nl_text_settings;
create policy admin_all on public.nl_text_settings for all using (private.is_admin_or_operator(auth.uid())) with check (private.is_admin_or_operator(auth.uid()));
create policy own_all on public.nl_text_settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.nl_text_caps(_uid uuid, out text_cap int, out li_request_cap int, out li_message_cap int)
language sql stable security definer set search_path = public as $$
  select coalesce(s.text_cap, case when coalesce(s.phone_type,'iphone_ios18') like 'android%' then 25 else 40 end),
         coalesce(s.li_request_cap, 20), coalesce(s.li_message_cap, 40)
  from (select 1) x left join nl_text_settings s on s.user_id = _uid $$;

create or replace function public.nl_text_pull(_count int default 40, _state text default null)
returns int language plpgsql security definer set search_path = public as $$
declare _uid uuid := auth.uid(); n int := 0; r record; new_id uuid;
begin
  if _uid is null then raise exception 'Not signed in'; end if;
  perform public.nl_contractor_assert_can_sell(_uid);
  _count := least(greatest(coalesce(_count, 40), 1), 150);
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
        and length(coalesce(nl_phone10(coalesce(c.mobile_phone, c.phone, c.landline_phone)), '')) = 10
        and not exists (select 1 from nl_dnc_numbers d where d.phone_normalized = nl_phone10(coalesce(c.mobile_phone, c.phone, c.landline_phone)))
        and not exists (select 1 from nl_text_leads t where t.contact_id = c.id)
        and not exists (select 1 from nl_text_leads t where t.phone is not null and nl_phone10(t.phone) = nl_phone10(coalesce(c.mobile_phone, c.phone, c.landline_phone)))
        and not exists (select 1 from nl_text_leads t where t.pool_firm_id = f.id
              and (t.text_status = 'new' or (t.text_sent_at at time zone 'America/Los_Angeles')::date = (now() at time zone 'America/Los_Angeles')::date))
        and not exists (select 1 from nl_bdr_leads l join bdr_call_outcomes o on o.lead_id = l.id
              where l.pool_firm_id = f.id and o.outcome = any (array['Not Interested','Don''t See the Value','Already Have Someone','In-House Team','Bad Experience','Stacked Objections','Lost','Won','Not Interested / Don''t See the Value']))
      order by f.id, c.is_owner desc nulls last, c.rank, c.created_at
    ) x
    order by (signal is not null) desc,
             case firm_type when 'ria' then 1 when 'ibd' then 2 when 'hybrid' then 3 when 'independent_advisor' then 4 else 5 end, fca
    limit _count
  loop
    insert into nl_text_leads (rep_user_id, contact_id, pool_firm_id, firm_name, contact_name, first_name, phone, linkedin_url, city, state, aum, signal)
    values (_uid, r.contact_id, r.firm_id, r.firm_name, r.full_name, r.first_name, r.ph, nullif(trim(r.linkedin_url), ''), r.city, upper(r.state), r.aum, r.signal)
    on conflict (contact_id) do nothing returning id into new_id;
    if new_id is not null then n := n + 1; new_id := null; end if;
  end loop;
  return n;
end $$;

create or replace function public.nl_text_send(_id uuid, _channel text, _when timestamptz default null, _template uuid default null, _body text default null)
returns void language plpgsql security definer set search_path = public as $$
declare _uid uuid := auth.uid(); t nl_text_leads; w timestamptz := coalesce(_when, now()); caps record; used int; cap int;
begin
  select * into t from nl_text_leads where id = _id and rep_user_id = _uid;
  if not found then raise exception 'Not your lead'; end if;
  if _channel not in ('text','li_connect','li_message') then raise exception 'Bad channel'; end if;
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
    update nl_text_leads set li_status = case _channel when 'li_connect' then 'requested' else 'sent' end, li_sent_at = w where id = _id;
  end if;
end $$;

create or replace function public.nl_text_unsend(_id uuid, _channel text)
returns void language plpgsql security definer set search_path = public as $$
declare _uid uuid := auth.uid();
begin
  if not exists (select 1 from nl_text_leads where id = _id and rep_user_id = _uid) then raise exception 'Not your lead'; end if;
  delete from nl_text_sends where id = (select id from nl_text_sends where text_lead_id = _id and channel = _channel order by sent_at desc limit 1);
  if _channel = 'text' then update nl_text_leads set text_status = 'new', text_sent_at = null, text_template_id = null where id = _id;
  elsif _channel = 'li_connect' then update nl_text_leads set li_status = 'new', li_sent_at = null where id = _id;
  else update nl_text_leads set li_status = case when exists (select 1 from nl_text_sends where text_lead_id = _id and channel = 'li_connect') then 'requested' else 'new' end where id = _id;
  end if;
end $$;

create or replace function public.nl_text_outcome(_id uuid, _channel text, _outcome text)
returns void language plpgsql security definer set search_path = public as $$
declare _uid uuid := auth.uid(); t nl_text_leads; res text; p text;
begin
  select * into t from nl_text_leads where id = _id and rep_user_id = _uid;
  if not found then raise exception 'Not your lead'; end if;
  if _outcome not in ('Won','Lost','Said They Would Reach Out','Didn''t Answer','Gatekeeper','Didn''t Get Past Gatekeeper','Not Interested','Don''t See the Value',
      'Need to Think','Need to Talk to Someone','Too Expensive','What''s Your Pricing','Bad Experience','Already Have Someone','In-House Team','Stacked Objections',
      'Schedule Callback','No Reply','Wrong Number','Stop') then raise exception 'Unknown outcome'; end if;
  res := case
    when _outcome = 'Stop' then 'stop' when _outcome = 'Wrong Number' then 'wrong_number' when _outcome = 'No Reply' then 'no_reply'
    when _outcome = 'Won' then 'booked'
    when _outcome in ('Lost','Not Interested','Don''t See the Value','Bad Experience','Already Have Someone','In-House Team','Stacked Objections','Too Expensive') then 'lost'
    else 'replied' end;
  insert into nl_text_outcomes (rep_user_id, text_lead_id, channel, outcome) values (_uid, _id, _channel, _outcome);
  update nl_text_leads set result = res, outcome = _outcome, outcome_channel = _channel, outcome_at = now() where id = _id;
  if _outcome = 'Stop' then
    p := nl_phone10(t.phone);
    if p is not null and length(p) = 10 and not exists (select 1 from nl_dnc_numbers d where d.phone_normalized = p) then
      insert into nl_dnc_numbers (phone_normalized, reason, contact_id, added_by) values (p, 'Asked to stop (text/LinkedIn outreach)', t.contact_id, _uid);
    end if;
  end if;
end $$;

create or replace function public.nl_text_book(_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare _uid uuid := auth.uid(); t nl_text_leads; f nl_lead_pool_firms; lid uuid;
  internal constant uuid := '00000000-0000-0000-0000-0000000000ff';
begin
  select * into t from nl_text_leads where id = _id and rep_user_id = _uid;
  if not found then raise exception 'Not your lead'; end if;
  if t.lead_id is not null then return t.lead_id; end if;
  select id into lid from nl_bdr_leads where user_id = _uid and pool_firm_id = t.pool_firm_id limit 1;
  if lid is null then
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
  update nl_text_leads set lead_id = lid, result = 'booked', outcome_at = now() where id = _id;
  return lid;
end $$;

insert into nl_text_templates (channel, name, body, position)
select * from (values
 ('text','A — new clients','Hey {first}, it''s {rep}. We help advisors in {city} bring in new clients. How many new clients could you take on right now?',1),
 ('text','B — capacity','Hey {first}, {rep} here. Quick question: are you taking on new clients right now, and about how many a month could your team handle?',2),
 ('text','C — direct','Hey {first}, it''s {rep} with NewLight. We help advisors book more new-client meetings. Open to a quick look at how it''d work for {firm}?',3),
 ('text','D — calendar','Hey {first}, {rep}. Is your calendar full of new client meetings, or would you want more?',4),
 ('li_connect','Connect note','Hi {first}, I work with advisors on bringing in new clients. Would like to connect.',1),
 ('li_message','Message 1','Hey {first}, it''s {rep} with NewLight. We help advisors in {city} bring in new clients. How many new clients could you take on right now?',1)
) v(channel,name,body,position) where not exists (select 1 from nl_text_templates);
