-- Onboarding v2: the right documents are attached automatically from where the rep works (no toggles),
-- company countersigns, yearly compliance re-acknowledgment, W-9/TIN and state-report tracking, offboarding.

alter table public.nl_contractor_hires
  add column if not exists mailing_address text,
  add column if not exists phone text,
  add column if not exists work_city text,
  add column if not exists entity_type text,
  add column if not exists countersigned_at timestamptz,
  add column if not exists countersigned_by uuid,
  add column if not exists countersign_name text,
  add column if not exists w9_requested_at timestamptz,
  add column if not exists tin_matched_at timestamptz,
  add column if not exists state_report_filed_at date,
  add column if not exists state_report_confirmation text,
  add column if not exists offboarding jsonb not null default '{}'::jsonb;

alter table public.nl_contractor_states add column if not exists report_days int;
update public.nl_contractor_states set report_days = v.d from (values
 ('CO',20),('CT',20),('FL',20),('IA',15),('ME',7),('NH',20),('NY',20),('OH',20),('OR',20),('TX',20),('VA',20),('WV',14),('MS',15)) v(c,d)
 where state_code = v.c;
update public.nl_contractor_states set report_note = 'Report to Iowa''s new-hire directory within 15 days once payments are expected to pass the federal 1099 threshold ($2,000).' where state_code = 'IA';
update public.nl_contractor_states set report_note = 'Report to Maine''s new-hire directory within 7 days of signing when you expect to pay $2,500+ in a year.' where state_code = 'ME';
update public.nl_contractor_states set report_note = 'Report to Ohio''s new-hire directory within 20 days (include the date payments begin and length of engagement).' where state_code = 'OH';
update public.nl_contractor_states set report_note = 'Report to Oregon''s new-hire directory within 20 days once engaged for more than 20 days.' where state_code = 'OR';
update public.nl_contractor_states set note = 'Colorado presumes workers are employees. The app adds the Colorado addendum (bold unemployment disclosure, 12-month term). Ask the attorney before hiring here.' where state_code = 'CO';
update public.nl_contractor_states set note = 'Arizona: the app adds the Declaration of Independent Business Status and a signed-receipt page. Unpaid commissions can cost 3x.' where state_code = 'AZ';
update public.nl_contractor_states set note = 'West Virginia: the app adds the five contractor acknowledgments the state''s safe harbor requires.' where state_code = 'WV';

alter table public.nl_contractor_docs
  add column if not exists applies_states text[],          -- null = every state
  add column if not exists applies_cities text[],          -- 'seattle|WA' style; null = any city
  add column if not exists sort_order int not null default 100,
  add column if not exists renew_months int,               -- re-sign after N months (null = never)
  add column if not exists after_countersign boolean not null default false,
  add column if not exists summary text;
update public.nl_contractor_docs set sort_order = 10, summary = 'How you work with NewLight and how you''re paid.' where slug = 'contractor-agreement';

-- Is this document for this rep?
create or replace function public.nl_contractor_doc_applies(p_doc public.nl_contractor_docs, p_hire public.nl_contractor_hires)
returns boolean language sql stable as $$
  select (p_doc.applies_states is null or p_hire.state_code = any(p_doc.applies_states))
     and (p_doc.applies_cities is null or (lower(trim(coalesce(p_hire.work_city, ''))) || '|' || p_hire.state_code) = any(p_doc.applies_cities))
     and (not p_doc.after_countersign or p_hire.countersigned_at is not null)
$$;

create or replace function public.nl_contractor_render(p_hire_id uuid, p_doc_id uuid, p_date date default current_date)
returns text language plpgsql stable security definer set search_path = public as $$
declare h record; d record; s text; out text;
begin
  select * into h from nl_contractor_hires where id = p_hire_id;
  select * into d from nl_contractor_docs where id = p_doc_id;
  if h is null or d is null then return null; end if;
  if not (private.has_role(auth.uid(), 'admin'::app_role) or h.user_id = auth.uid()) then raise exception 'not allowed'; end if;
  select state_name into s from nl_contractor_states where state_code = h.state_code;
  out := d.body_md;
  out := replace(out, '{{contractor_name}}', h.full_name);
  out := replace(out, '{{contractor_business}}', coalesce(nullif(trim(h.business_name), ''), h.full_name));
  out := replace(out, '{{contractor_state}}', coalesce(s, h.state_code));
  out := replace(out, '{{contractor_email}}', h.email);
  out := replace(out, '{{contractor_address}}', coalesce(nullif(trim(h.mailing_address), ''), '(address not given yet)'));
  out := replace(out, '{{contractor_phone}}', coalesce(nullif(trim(h.phone), ''), '—'));
  out := replace(out, '{{work_location}}', coalesce(nullif(trim(h.work_city), '') || ', ', '') || coalesce(s, h.state_code));
  out := replace(out, '{{company_address}}', '1558 Orchard Dr, Ojai, CA 93023');
  out := replace(out, '{{countersign_name}}', coalesce(h.countersign_name, ''));
  out := replace(out, '{{countersigned_on}}', coalesce(to_char(h.countersigned_at, 'FMMonth FMDD, YYYY'), ''));
  out := replace(out, '{{commission_terms}}', h.commission_terms);
  out := replace(out, '{{effective_date}}', to_char(p_date, 'FMMonth FMDD, YYYY'));
  return out;
end $$;

-- The rep fills in their own contact details (needed in the contract by freelancer laws)
create or replace function public.nl_contractor_set_profile(p_address text, p_phone text, p_city text, p_entity text, p_business text)
returns void language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  select id into hid from nl_contractor_hires where user_id = auth.uid() and status <> 'ended' order by created_at desc limit 1;
  if hid is null then raise exception 'No paperwork found for your account.'; end if;
  if length(trim(coalesce(p_address, ''))) < 8 then raise exception 'Enter your full mailing address.'; end if;
  if length(trim(coalesce(p_city, ''))) < 2 then raise exception 'Enter the city you work from.'; end if;
  update nl_contractor_hires set mailing_address = trim(p_address), phone = nullif(trim(p_phone), ''), work_city = initcap(trim(p_city)),
    entity_type = nullif(trim(p_entity), ''), business_name = coalesce(nullif(trim(p_business), ''), business_name), updated_at = now()
  where id = hid;
end $$;

create or replace function public.nl_contractor_my_packet()
returns jsonb language plpgsql security definer set search_path = public as $$
declare h public.nl_contractor_hires; em text; docs jsonb;
begin
  if auth.uid() is null then return null; end if;
  select * into h from nl_contractor_hires where user_id = auth.uid() and status <> 'ended' order by created_at desc limit 1;
  if h.id is null then
    select lower(email) into em from auth.users where id = auth.uid();
    select * into h from nl_contractor_hires where lower(email) = em and status <> 'ended' and user_id is null order by created_at desc limit 1;
    if h.id is null then return null; end if;
    update nl_contractor_hires set user_id = auth.uid(), updated_at = now() where id = h.id;
    h.user_id := auth.uid();
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'doc_id', d.id, 'slug', d.slug, 'version', d.version, 'title', d.title, 'summary', d.summary,
      'body', nl_contractor_render(h.id, d.id),
      'body_sha256', encode(extensions.digest(nl_contractor_render(h.id, d.id), 'sha256'), 'hex'),
      'signature', (select jsonb_build_object('id', g.id, 'signed_at', g.signed_at, 'typed_name', g.typed_name, 'doc_version', g.doc_version, 'body', g.body_snapshot, 'body_sha256', g.body_sha256)
                    from nl_contractor_signatures g where g.hire_id = h.id and g.doc_slug = d.slug
                      and (d.renew_months is null or g.signed_at > now() - make_interval(months => d.renew_months))
                    order by g.signed_at desc limit 1)
    ) order by d.sort_order, d.slug), '[]'::jsonb)
  into docs
  from nl_contractor_docs d
  where d.active and d.version = (select max(version) from nl_contractor_docs x where x.slug = d.slug and x.active)
    and nl_contractor_doc_applies(d, h);
  return jsonb_build_object('hire', jsonb_build_object('id', h.id, 'full_name', h.full_name, 'business_name', h.business_name, 'state_code', h.state_code,
      'status', h.status, 'w9_received_at', h.w9_received_at, 'mailing_address', h.mailing_address, 'phone', h.phone, 'work_city', h.work_city,
      'entity_type', h.entity_type, 'countersigned_at', h.countersigned_at, 'countersign_name', h.countersign_name),
    'waiting_countersign', exists (select 1 from nl_contractor_docs d where d.active and d.after_countersign and h.countersigned_at is null
        and (d.applies_states is null or h.state_code = any(d.applies_states))),
    'docs', docs);
end $$;

-- Status: 'signed' once every document that applies is signed (and current)
create or replace function public.nl_contractor_refresh_status(p_hire_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare h public.nl_contractor_hires; remaining int; st text;
begin
  select * into h from nl_contractor_hires where id = p_hire_id;
  if h.id is null or h.status = 'ended' then return h.status; end if;
  select count(*) into remaining from nl_contractor_docs d
   where d.active and d.version = (select max(version) from nl_contractor_docs x where x.slug = d.slug and x.active)
     and nl_contractor_doc_applies(d, h)
     and not exists (select 1 from nl_contractor_signatures g where g.hire_id = h.id and g.doc_slug = d.slug
                     and (d.renew_months is null or g.signed_at > now() - make_interval(months => d.renew_months)));
  st := case when remaining > 0 then 'invited' when h.w9_received_at is null then 'signed' else 'active' end;
  if st <> h.status then update nl_contractor_hires set status = st, updated_at = now() where id = h.id; end if;
  return st;
end $$;

create or replace function public.nl_contractor_sign(p_doc_id uuid, p_typed_name text, p_consent boolean, p_body_sha256 text, p_user_agent text)
returns uuid language plpgsql security definer set search_path = public as $$
declare h public.nl_contractor_hires; d public.nl_contractor_docs; body text; sha text; sid uuid; ip text;
begin
  if not coalesce(p_consent, false) then raise exception 'Please agree to sign electronically first.'; end if;
  if length(trim(coalesce(p_typed_name, ''))) < 3 then raise exception 'Type your full legal name to sign.'; end if;
  select * into h from nl_contractor_hires where user_id = auth.uid() and status <> 'ended' order by created_at desc limit 1;
  if h.id is null then raise exception 'No paperwork found for your account.'; end if;
  if h.mailing_address is null then raise exception 'Add your mailing address first (step 1).'; end if;
  select * into d from nl_contractor_docs where id = p_doc_id and active
    and version = (select max(version) from nl_contractor_docs x where x.slug = nl_contractor_docs.slug and x.active);
  if d.id is null or not nl_contractor_doc_applies(d, h) then raise exception 'That document is no longer current. Refresh the page.'; end if;
  body := nl_contractor_render(h.id, d.id);
  sha := encode(extensions.digest(body, 'sha256'), 'hex');
  if sha <> p_body_sha256 then raise exception 'The document changed since you opened it. Refresh the page and read it again.'; end if;
  begin
    ip := split_part(coalesce((current_setting('request.headers', true)::json)->>'x-forwarded-for', ''), ',', 1);
  exception when others then ip := null; end;
  insert into nl_contractor_signatures (hire_id, user_id, doc_id, doc_slug, doc_version, doc_title, body_snapshot, body_sha256, typed_name, esign_consent, ip, user_agent)
  values (h.id, auth.uid(), d.id, d.slug, d.version, d.title, body, sha, trim(p_typed_name), true, nullif(trim(ip), ''), left(p_user_agent, 400))
  returning id into sid;
  perform nl_contractor_refresh_status(h.id);
  return sid;
end $$;

-- Company countersignature (owner types their name)
create or replace function public.nl_contractor_countersign(p_hire_id uuid, p_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not private.has_role(auth.uid(), 'admin'::app_role) then raise exception 'Admins only'; end if;
  if length(trim(coalesce(p_name, ''))) < 3 then raise exception 'Type your full name to countersign.'; end if;
  if not exists (select 1 from nl_contractor_signatures g where g.hire_id = p_hire_id and g.doc_slug = 'contractor-agreement') then
    raise exception 'The rep has to sign the agreement first.';
  end if;
  update nl_contractor_hires set countersigned_at = now(), countersigned_by = auth.uid(), countersign_name = trim(p_name), updated_at = now() where id = p_hire_id;
  perform nl_contractor_refresh_status(p_hire_id);
end $$;

revoke all on function public.nl_contractor_set_profile(text, text, text, text, text) from public, anon;
revoke all on function public.nl_contractor_countersign(uuid, text) from public, anon;
revoke all on function public.nl_contractor_refresh_status(uuid) from public, anon;
grant execute on function public.nl_contractor_set_profile(text, text, text, text, text) to authenticated;
grant execute on function public.nl_contractor_countersign(uuid, text) to authenticated;
grant execute on function public.nl_contractor_refresh_status(uuid) to authenticated;
