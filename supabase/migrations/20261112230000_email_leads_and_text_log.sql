-- Email leads (Nov 12, 2026): 100 email leads per salesman, Sun–Thu 6pm Pacific, from the same lead pool and the same
-- state/city queue as call leads. Each one is also a normal Cold lead (nl_bdr_leads, list "Email · City, ST"), so a
-- booking runs through the usual pipeline. Salesmen copy/paste the template from the Email page and send it themselves.
-- YouTube: checked inside the database with pg_net (firm website first; YouTube Data API search only if the vault has
-- YOUTUBE_API_KEY). No edge functions. Also: nl_lead_texts logs the Dialer's Text button.

alter table public.nl_lead_auto_pull_settings add column if not exists email_enabled boolean not null default true;
alter table public.nl_lead_auto_pull_settings add column if not exists email_per_day int not null default 100;
alter table public.nl_lead_auto_pull_log add column if not exists channel text not null default 'call';

create table if not exists public.nl_email_leads (
  id uuid primary key default gen_random_uuid(),
  rep_user_id uuid not null,
  lead_id uuid references public.nl_bdr_leads(id) on delete set null,
  pool_firm_id uuid references public.nl_lead_pool_firms(id) on delete set null,
  contact_id uuid,
  firm_name text not null,
  owner_name text,
  owner_first text,
  owner_email text not null,
  website text,
  city text, state text,
  youtube_url text,
  youtube_status text not null default 'pending' check (youtube_status in ('pending','checking','found','none')),
  youtube_source text,
  yt_request_id bigint,
  yt_stage text,
  youtube_checked_at timestamptz,
  status text not null default 'new' check (status in ('new','sent','replied','booked','not_interested','unsubscribed','bounced')),
  sent_at timestamptz,
  outcome_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists nl_email_leads_rep on public.nl_email_leads (rep_user_id, created_at desc);
create index if not exists nl_email_leads_yt on public.nl_email_leads (youtube_status) where youtube_status in ('pending','checking');
create unique index if not exists nl_email_leads_lead on public.nl_email_leads (lead_id) where lead_id is not null;
alter table public.nl_email_leads enable row level security;
drop policy if exists admin_all on public.nl_email_leads;
create policy admin_all on public.nl_email_leads for all to authenticated using (private.is_admin_or_operator(auth.uid())) with check (private.is_admin_or_operator(auth.uid()));
drop policy if exists rep_own_read on public.nl_email_leads;
create policy rep_own_read on public.nl_email_leads for select to authenticated using (rep_user_id = auth.uid());

create table if not exists public.nl_email_optouts (
  email text primary key,
  reason text,
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.nl_email_optouts enable row level security;
drop policy if exists admin_all on public.nl_email_optouts;
create policy admin_all on public.nl_email_optouts for all to authenticated using (private.is_admin_or_operator(auth.uid())) with check (private.is_admin_or_operator(auth.uid()));

create table if not exists public.nl_lead_texts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.nl_bdr_leads(id) on delete cascade,
  rep_user_id uuid not null default auth.uid(),
  phone text not null,
  created_at timestamptz not null default now()
);
create index if not exists nl_lead_texts_lead on public.nl_lead_texts (lead_id);
alter table public.nl_lead_texts enable row level security;
drop policy if exists admin_all on public.nl_lead_texts;
create policy admin_all on public.nl_lead_texts for all to authenticated using (private.is_admin_or_operator(auth.uid())) with check (private.is_admin_or_operator(auth.uid()));
drop policy if exists rep_own on public.nl_lead_texts;
create policy rep_own on public.nl_lead_texts for all to authenticated using (rep_user_id = auth.uid()) with check (rep_user_id = auth.uid() and private.is_internal_staff(auth.uid()));

-- First name for "Hi ___." (null when it doesn't look like a person's first name → page shows "Hi there.")
create or replace function public.nl_first_name(_full text) returns text language sql immutable as $$
  select case when w ~ '^[A-Za-z][A-Za-z''-]{1,}$' then initcap(w) else null end
  from (select split_part(regexp_replace(trim(coalesce(_full, '')), '^(mr|mrs|ms|dr|miss)\.?\s+', '', 'i'), ' ', 1) w) x
$$;

-- Claim up to _count email leads in one state/city for one salesman.
create or replace function public.nl_pool_claim_email_for(_rep uuid, _state text, _city text, _count int)
returns int language plpgsql security definer set search_path = public as $$
declare f record; k record; n int := 0; new_id uuid;
  internal constant uuid := '00000000-0000-0000-0000-0000000000ff';
begin
  if _count is null or _count < 1 then return 0; end if;
  for f in
    select p.* from nl_lead_pool_firms p
    where p.status = 'available'
      and (_state is null or upper(p.state) = upper(_state))
      and (_city is null or upper(p.city) = upper(_city))
      and exists (select 1 from nl_lead_pool_contacts c where c.firm_id = p.id and not c.do_not_call and coalesce(c.email, '') <> ''
                  and not exists (select 1 from nl_email_optouts o where o.email = lower(c.email)))
    order by (p.signal is not null) desc, (_rep = any(p.previous_owner_ids)) asc,
             case p.firm_type when 'ria' then 1 when 'ibd' then 2 when 'hybrid' then 3 when 'independent_advisor' then 4 else 5 end,
             p.recycle_count asc, p.created_at asc
    limit _count
    for update skip locked
  loop
    select c.* into k from nl_lead_pool_contacts c
      where c.firm_id = f.id and not c.do_not_call and coalesce(c.email, '') <> ''
        and not exists (select 1 from nl_email_optouts o where o.email = lower(c.email))
      order by c.is_owner desc nulls last, c.rank, c.created_at limit 1;
    begin
      insert into nl_bdr_leads (user_id, client_id, business_name, owner_name, phone, front_desk_phone, owner_direct_phone, website,
          niche, city, state, crd, email, lead_source, list_name, pipeline_stage, pool_firm_id)
      values (_rep, internal, f.name, k.full_name, f.main_phone, f.main_phone, coalesce(k.mobile_phone, k.landline_phone, k.phone),
          f.website, nl_niche_label(f.firm_type), f.city, upper(f.state), f.crd, k.email, 'advizorpro',
          'Email · ' || coalesce(nullif(initcap(f.city), '') || ', ' || upper(f.state), 'AdvizorPro Pool'), 'cold', f.id)
      returning id into new_id;
    exception when unique_violation then
      begin
        insert into nl_bdr_leads (user_id, client_id, business_name, owner_name, website, niche, city, state, crd, email,
            lead_source, list_name, pipeline_stage, pool_firm_id, notes)
        values (_rep, internal, f.name, k.full_name, f.website, nl_niche_label(f.firm_type), f.city, upper(f.state), f.crd, k.email,
            'advizorpro', 'Email · ' || coalesce(nullif(initcap(f.city), '') || ', ' || upper(f.state), 'AdvizorPro Pool'), 'cold', f.id,
            'Phone shared with another lead — see Decision Makers for numbers.')
        returning id into new_id;
      exception when others then
        update nl_lead_pool_firms set status = 'disqualified', updated_at = now() where id = f.id;
        continue;
      end;
    end;
    update nl_lead_pool_firms set status = 'claimed', owner_rep_id = _rep, lead_id = new_id, claimed_at = now(),
      last_activity_at = now(), attempt_count = 0, updated_at = now() where id = f.id;
    insert into nl_email_leads (rep_user_id, lead_id, pool_firm_id, contact_id, firm_name, owner_name, owner_first, owner_email, website, city, state, youtube_status)
    values (_rep, new_id, f.id, k.id, f.name, k.full_name, coalesce(nl_first_name(k.first_name), nl_first_name(k.full_name)), lower(k.email),
            nullif(trim(f.website), ''), f.city, upper(f.state), 'pending');
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.nl_pool_claim_email_for(uuid, text, text, int) from public, anon, authenticated;

-- One salesman's nightly email pull: walks the same city queue as the call pull.
create or replace function public.nl_email_pull_for(_rep uuid, _count int default null)
returns int language plpgsql security definer set search_path = public as $$
declare need int; got int; total int := 0; c record; used text[] := '{}'; why text;
begin
  need := coalesce(_count, (select email_per_day from nl_lead_auto_pull_settings where id = 1), 100);
  why := nl_contractor_sell_block_reason(_rep);
  if why is not null then
    insert into nl_lead_auto_pull_log (rep_user_id, requested, pulled, note, channel) values (_rep, need, 0, 'Skipped: ' || why, 'email');
    return 0;
  end if;
  for c in select * from nl_lead_territories t where t.rep_user_id = _rep and t.active and t.status <> 'done'
           order by (t.city is null), t.position nulls last, t.created_at loop
    exit when need <= 0;
    got := nl_pool_claim_email_for(_rep, c.state, c.city, need);
    if got > 0 then used := used || (coalesce(c.city, 'All of') || ', ' || upper(c.state) || ' (' || got || ')'); end if;
    need := need - got; total := total + got;
  end loop;
  insert into nl_lead_auto_pull_log (rep_user_id, requested, pulled, cities, note, channel)
  values (_rep, total + need, total, used, case when need > 0 then 'Short ' || need || ': not enough firms with an owner email in this salesman''s cities.' end, 'email');
  return total;
end $$;
revoke all on function public.nl_email_pull_for(uuid, int) from public, anon, authenticated;

create or replace function public.nl_email_pull_daily()
returns int language plpgsql security definer set search_path = public as $$
declare r record; n int := 0; local_now timestamp := now() at time zone 'America/Los_Angeles';
begin
  if not coalesce((select email_enabled from nl_lead_auto_pull_settings where id = 1), false) then return 0; end if;
  if extract(hour from local_now) <> 18 or extract(dow from local_now) not in (0, 1, 2, 3, 4) then return 0; end if;
  for r in select distinct t.rep_user_id from nl_lead_territories t
           join user_roles ur on ur.user_id = t.rep_user_id and ur.role = 'marketing_staff'
           where t.active and t.city is not null loop
    continue when exists (select 1 from nl_lead_auto_pull_log l where l.rep_user_id = r.rep_user_id and l.channel = 'email'
                          and l.run_at > now() - interval '90 minutes');
    n := n + nl_email_pull_for(r.rep_user_id);
  end loop;
  return n;
end $$;
revoke all on function public.nl_email_pull_daily() from public, anon, authenticated;

-- Admin: run now for one salesman.
create or replace function public.nl_email_pull_now(_rep uuid, _count int default null)
returns int language plpgsql security definer set search_path = public as $$
begin
  if not private.is_admin_or_operator(auth.uid()) then raise exception 'Admins only'; end if;
  return nl_email_pull_for(_rep, _count);
end $$;
grant execute on function public.nl_email_pull_now(uuid, int) to authenticated;

-- Salesman marks an email lead: sent / replied / booked / not_interested / unsubscribed / bounced.
create or replace function public.nl_email_set_status(_id uuid, _status text)
returns void language plpgsql security definer set search_path = public as $$
declare e nl_email_leads;
begin
  select * into e from nl_email_leads where id = _id;
  if e.id is null then raise exception 'Not found'; end if;
  if e.rep_user_id <> auth.uid() and not private.is_admin_or_operator(auth.uid()) then raise exception 'Not your lead'; end if;
  if _status not in ('new','sent','replied','booked','not_interested','unsubscribed','bounced') then raise exception 'Bad status'; end if;
  update nl_email_leads set status = _status,
    sent_at = case when _status = 'new' then null when sent_at is null then now() else sent_at end,
    outcome_at = case when _status in ('new','sent') then null else now() end
  where id = _id;
  if _status = 'unsubscribed' then
    insert into nl_email_optouts (email, reason, created_by) values (e.owner_email, 'Asked to stop', auth.uid()) on conflict (email) do nothing;
  end if;
  if _status in ('not_interested', 'unsubscribed') and e.pool_firm_id is not null then
    update nl_lead_pool_firms set status = 'cooldown', rested_at = now(), updated_at = now(),
      rest_reason = case when _status = 'unsubscribed' then 'Unsubscribed (email)' else 'Not interested (email)' end,
      cooldown_until = now() + make_interval(days => case when _status = 'unsubscribed' then 365 else nl_rest_days('Not interested') end)
    where id = e.pool_firm_id and status = 'claimed';
  end if;
end $$;
grant execute on function public.nl_email_set_status(uuid, text) to authenticated;

-- A booking (Cold → Warm) marks the email lead Booked.
create or replace function public.nl_email_mark_booked() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(old.pipeline_stage, 'cold') = 'cold' and new.pipeline_stage in ('warm', 'hot', 'won') then
    update nl_email_leads set status = 'booked', outcome_at = now(), sent_at = coalesce(sent_at, now())
    where lead_id = new.id and status in ('new', 'sent', 'replied');
  end if;
  return new;
end $$;
drop trigger if exists nl_email_mark_booked on public.nl_bdr_leads;
create trigger nl_email_mark_booked after update of pipeline_stage on public.nl_bdr_leads
for each row execute function public.nl_email_mark_booked();

-- Friday release: an email that was sent, or a text, counts as touching the lead.
CREATE OR REPLACE FUNCTION public.nl_pool_release_untouched()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare a int; local_now timestamp := now() at time zone 'America/Los_Angeles';
begin
  if extract(hour from local_now) <> 21 or extract(isodow from local_now) <> 5 then return 0; end if;
  with idle as (
    select p.id, p.lead_id from nl_lead_pool_firms p join nl_bdr_leads l on l.id = p.lead_id
    where p.status = 'claimed' and l.pool_firm_id is not null
      and nl_workdays_between(p.claimed_at, now()) >= 10
      and not exists (select 1 from nl_lead_call_log g where g.lead_id = p.lead_id)
      and not exists (select 1 from bdr_call_outcomes o where o.lead_id = p.lead_id)
      and not exists (select 1 from nl_email_leads e where e.lead_id = p.lead_id and e.status <> 'new')
      and not exists (select 1 from nl_lead_texts x where x.lead_id = p.lead_id)
      and coalesce(l.called, false) = false and coalesce(l.pipeline_stage, 'cold') = 'cold'
      and jsonb_array_length(coalesce(l.outcome_history, '[]'::jsonb)) = 0
  ), del as (delete from nl_bdr_leads l using idle where l.id = idle.lead_id returning idle.id)
  update nl_lead_pool_firms p set status = 'available', previous_owner_ids = array_append(previous_owner_ids, owner_rep_id),
     owner_rep_id = null, lead_id = null, claimed_at = null, updated_at = now()
  from del where p.id = del.id;
  get diagnostics a = row_count;
  return a;
end $function$;

-- ---------- YouTube check (pg_net, no edge function) ----------
-- Sites behind Cloudflare's bot check return 403 and are treated as "no YouTube found" unless the vault has YOUTUBE_API_KEY.
create or replace function public.nl_youtube_from_html(_html text) returns text language sql immutable as $$
  select 'https://www.youtube.com/' || m[1]
  from regexp_matches(coalesce(_html, ''), 'youtube\.com/((?:@[A-Za-z0-9_.\-]{2,})|(?:channel/[A-Za-z0-9_\-]{10,})|(?:c/[A-Za-z0-9_.\-]{2,})|(?:user/[A-Za-z0-9_.\-]{2,}))', 'i') m
  where m[1] !~* '^(@?youtube|c/youtube)'
  limit 1
$$;

-- Step 1: collect finished website fetches / API searches. Step 2: start new ones (25 per run).
create or replace function public.nl_email_youtube_tick()
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare e record; r record; yt text; key text; loc text; started int := 0; done int := 0; url text; q text; it jsonb;
begin
  -- collect
  for e in select * from nl_email_leads where youtube_status = 'checking' and yt_request_id is not null loop
    select status_code, content::text as body, headers into r from net._http_response where id = e.yt_request_id;
    if not found then
      if e.youtube_checked_at < now() - interval '30 minutes' then
        update nl_email_leads set youtube_status = 'none', yt_request_id = null where id = e.id;
      end if;
      continue;
    end if;
    done := done + 1;
    if e.yt_stage = 'site' then
      if r.status_code between 300 and 399 and coalesce(r.headers->>'location', r.headers->>'Location', '') <> '' and e.website not like '%#redirected' then
        loc := coalesce(r.headers->>'location', r.headers->>'Location');
        if loc !~* '^https?://' then loc := regexp_replace(e.website, '^(https?://[^/]+).*$', '\1') || loc; end if;
        update nl_email_leads set yt_request_id = net.http_get(url := loc, headers := '{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"}'::jsonb, timeout_milliseconds := 15000),
          website = e.website || '#redirected', youtube_checked_at = now() where id = e.id;
        continue;
      end if;
      yt := case when r.status_code between 200 and 299 then nl_youtube_from_html(r.body) end;
      if yt is not null then
        update nl_email_leads set youtube_status = 'found', youtube_url = yt, youtube_source = 'website', yt_request_id = null,
          website = replace(e.website, '#redirected', ''), youtube_checked_at = now() where id = e.id;
        continue;
      end if;
      -- fallback: YouTube API search, only if a key is in the vault
      select decrypted_secret into key from vault.decrypted_secrets where name = 'YOUTUBE_API_KEY' limit 1;
      if key is not null and coalesce(e.owner_name, '') <> '' then
        q := e.owner_name || ' ' || e.firm_name;
        update nl_email_leads set yt_stage = 'api', website = replace(e.website, '#redirected', ''), youtube_checked_at = now(),
          yt_request_id = net.http_get(url := 'https://www.googleapis.com/youtube/v3/search',
            params := jsonb_build_object('part', 'snippet', 'type', 'channel', 'maxResults', '3', 'q', q, 'key', key),
            timeout_milliseconds := 15000)
        where id = e.id;
      else
        update nl_email_leads set youtube_status = 'none', yt_request_id = null, website = replace(e.website, '#redirected', ''), youtube_checked_at = now() where id = e.id;
      end if;
    else -- api stage: accept a channel only if its title/description mentions the firm (first word 4+ letters) or the owner's full name
      yt := null;
      if r.status_code = 200 then
        for it in select * from jsonb_array_elements(coalesce((r.body)::jsonb -> 'items', '[]'::jsonb)) loop
          if (lower(coalesce(it #>> '{snippet,title}', '') || ' ' || coalesce(it #>> '{snippet,description}', '')) like '%' || lower(e.owner_name) || '%')
             or (length(split_part(regexp_replace(lower(e.firm_name), '[^a-z0-9 ]', '', 'g'), ' ', 1)) >= 4
                 and lower(coalesce(it #>> '{snippet,title}', '') || ' ' || coalesce(it #>> '{snippet,description}', ''))
                     like '%' || split_part(regexp_replace(lower(e.firm_name), '[^a-z0-9 ]', '', 'g'), ' ', 1) || '%') then
            yt := 'https://www.youtube.com/channel/' || (it #>> '{id,channelId}');
            exit;
          end if;
        end loop;
      end if;
      update nl_email_leads set youtube_status = case when yt is null then 'none' else 'found' end, youtube_url = yt,
        youtube_source = case when yt is null then null else 'search' end, yt_request_id = null, youtube_checked_at = now() where id = e.id;
    end if;
  end loop;
  -- start
  for e in select * from nl_email_leads where youtube_status = 'pending' order by created_at limit 25 loop
    if e.website is null then
      select decrypted_secret into key from vault.decrypted_secrets where name = 'YOUTUBE_API_KEY' limit 1;
      if key is not null and coalesce(e.owner_name, '') <> '' then
        update nl_email_leads set youtube_status = 'checking', yt_stage = 'api', youtube_checked_at = now(),
          yt_request_id = net.http_get(url := 'https://www.googleapis.com/youtube/v3/search',
            params := jsonb_build_object('part', 'snippet', 'type', 'channel', 'maxResults', '3', 'q', e.owner_name || ' ' || e.firm_name, 'key', key),
            timeout_milliseconds := 15000)
        where id = e.id;
      else
        update nl_email_leads set youtube_status = 'none', youtube_checked_at = now() where id = e.id;
      end if;
    else
      url := case when e.website ~* '^https?://' then e.website else 'https://' || e.website end;
      update nl_email_leads set youtube_status = 'checking', yt_stage = 'site', website = url, youtube_checked_at = now(),
        yt_request_id = net.http_get(url := url, headers := '{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"}'::jsonb, timeout_milliseconds := 15000)
      where id = e.id;
    end if;
    started := started + 1;
  end loop;
  return jsonb_build_object('collected', done, 'started', started);
end $$;
revoke all on function public.nl_email_youtube_tick() from public, anon, authenticated;

select cron.unschedule('nl-email-pull-daily') where exists (select 1 from cron.job where jobname = 'nl-email-pull-daily');
select cron.schedule('nl-email-pull-daily', '1 1,2 * * 1-5', $c$select public.nl_email_pull_daily();$c$);
select cron.unschedule('nl-email-youtube-2min') where exists (select 1 from cron.job where jobname = 'nl-email-youtube-2min');
select cron.schedule('nl-email-youtube-2min', '*/2 * * * *', $c$select public.nl_email_youtube_tick();$c$);

-- Training (applied live): Module 2 chapter 12 "Email leads and the Text button" added; M2.11 BDR table gained the email-pull row.

-- Nov 12 (applied live): nightly media research (scheduled task "Nightly email lead research", 6:12pm + 11:12pm PT Sun–Thu)
alter table nl_email_leads
  add column if not exists research_status text not null default 'pending' check (research_status in ('pending','researching','done')),
  add column if not exists researched_at timestamptz,
  add column if not exists media_kind text check (media_kind in ('youtube','podcast')),
  add column if not exists media_url text,
  add column if not exists media_title text,
  add column if not exists media_notes text,
  add column if not exists podcast_url text,
  add column if not exists podcast_name text;
create index if not exists nl_email_leads_research_idx on nl_email_leads(research_status, created_at);

-- Nov 13 (applied live): sending inboxes + rotation for the "Open in Gmail" button
create table if not exists nl_sending_inboxes (
  id uuid primary key default gen_random_uuid(),
  rep_user_id uuid not null default auth.uid(),
  email text not null,
  daily_limit int not null default 10 check (daily_limit between 1 and 50),
  active boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (rep_user_id, email)
);
alter table nl_sending_inboxes enable row level security;
-- policies: admin all; rep manages own (internal staff). nl_email_leads.sent_from added;
-- nl_email_set_status(_id, _status, _sent_from default null) records which inbox sent it.
alter table nl_email_leads add column if not exists sent_from text;
