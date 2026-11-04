-- Contractor paperwork: 1099 commission-only sales reps sign their agreement in the app.
-- No SSNs, bank numbers or ID images are stored here (the W-9 and bank details live in the payment provider).

-- States we hire contractors in (CA / MA / NJ use the ABC test: sales reps count as employees there)
create table if not exists public.nl_contractor_states (
  state_code text primary key,
  state_name text not null,
  allowed boolean not null default true,
  note text,
  updated_at timestamptz not null default now()
);
alter table public.nl_contractor_states enable row level security;
drop policy if exists "contractor states read" on public.nl_contractor_states;
create policy "contractor states read" on public.nl_contractor_states for select to authenticated using (true);
drop policy if exists "contractor states admin" on public.nl_contractor_states;
create policy "contractor states admin" on public.nl_contractor_states for all to authenticated
  using (private.has_role(auth.uid(), 'admin'::app_role)) with check (private.has_role(auth.uid(), 'admin'::app_role));

insert into public.nl_contractor_states (state_code, state_name, allowed, note) values
('AL','Alabama',true,null),('AK','Alaska',true,null),('AZ','Arizona',true,null),('AR','Arkansas',true,null),
('CA','California',false,'ABC test (AB 5): a rep selling our core service is an employee. Hire as W-2 or not at all.'),
('CO','Colorado',true,null),('CT','Connecticut',true,'ABC test for unemployment insurance. Ask the attorney before hiring here.'),
('DE','Delaware',true,null),('DC','District of Columbia',true,null),('FL','Florida',true,null),('GA','Georgia',true,null),
('HI','Hawaii',true,null),('ID','Idaho',true,null),('IL','Illinois',true,'ABC test for unemployment and wage law. Ask the attorney before hiring here.'),
('IN','Indiana',true,null),('IA','Iowa',true,null),('KS','Kansas',true,null),('KY','Kentucky',true,null),('LA','Louisiana',true,null),
('ME','Maine',true,null),('MD','Maryland',true,null),
('MA','Massachusetts',false,'ABC test: a rep selling our core service is an employee. Hire as W-2 or not at all.'),
('MI','Michigan',true,null),('MN','Minnesota',true,null),('MS','Mississippi',true,null),('MO','Missouri',true,null),('MT','Montana',true,null),
('NE','Nebraska',true,null),('NV','Nevada',true,null),('NH','New Hampshire',true,null),
('NJ','New Jersey',false,'ABC test: a rep selling our core service is an employee. Hire as W-2 or not at all.'),
('NM','New Mexico',true,null),('NY','New York',true,null),('NC','North Carolina',true,null),('ND','North Dakota',true,null),('OH','Ohio',true,null),
('OK','Oklahoma',true,null),('OR','Oregon',true,null),('PA','Pennsylvania',true,null),('RI','Rhode Island',true,null),('SC','South Carolina',true,null),
('SD','South Dakota',true,null),('TN','Tennessee',true,null),('TX','Texas',true,null),('UT','Utah',true,null),('VT','Vermont',true,'ABC test for unemployment insurance. Ask the attorney before hiring here.'),
('VA','Virginia',true,null),('WA','Washington',true,null),('WV','West Virginia',true,null),('WI','Wisconsin',true,null),('WY','Wyoming',true,null)
on conflict (state_code) do nothing;

-- Agreement versions. Signed copies keep their own frozen text, so editing makes a new version.
create table if not exists public.nl_contractor_docs (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  version int not null,
  title text not null,
  body_md text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  unique (slug, version)
);
alter table public.nl_contractor_docs enable row level security;
drop policy if exists "contractor docs read" on public.nl_contractor_docs;
create policy "contractor docs read" on public.nl_contractor_docs for select to authenticated using (true);
drop policy if exists "contractor docs admin" on public.nl_contractor_docs;
create policy "contractor docs admin" on public.nl_contractor_docs for all to authenticated
  using (private.has_role(auth.uid(), 'admin'::app_role)) with check (private.has_role(auth.uid(), 'admin'::app_role));

-- One row per contractor
create table if not exists public.nl_contractor_hires (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  business_name text,
  state_code text not null references public.nl_contractor_states(state_code),
  commission_terms text not null,
  status text not null default 'invited' check (status in ('invited','signed','active','ended')),
  user_id uuid,
  w9_received_at timestamptz,
  w9_received_by uuid,
  ended_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists nl_contractor_hires_email_open on public.nl_contractor_hires (lower(email)) where status <> 'ended';
alter table public.nl_contractor_hires enable row level security;
drop policy if exists "contractor hires admin" on public.nl_contractor_hires;
create policy "contractor hires admin" on public.nl_contractor_hires for all to authenticated
  using (private.has_role(auth.uid(), 'admin'::app_role)) with check (private.has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "contractor hires self read" on public.nl_contractor_hires;
create policy "contractor hires self read" on public.nl_contractor_hires for select to authenticated using (user_id = auth.uid());

-- Signed copies: insert only through nl_contractor_sign(); never updated or deleted
create table if not exists public.nl_contractor_signatures (
  id uuid primary key default gen_random_uuid(),
  hire_id uuid not null references public.nl_contractor_hires(id),
  user_id uuid not null,
  doc_id uuid not null references public.nl_contractor_docs(id),
  doc_slug text not null,
  doc_version int not null,
  doc_title text not null,
  body_snapshot text not null,
  body_sha256 text not null,
  typed_name text not null,
  esign_consent boolean not null check (esign_consent),
  signed_at timestamptz not null default now(),
  ip text,
  user_agent text
);
alter table public.nl_contractor_signatures enable row level security;
drop policy if exists "contractor sigs admin read" on public.nl_contractor_signatures;
create policy "contractor sigs admin read" on public.nl_contractor_signatures for select to authenticated using (private.has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "contractor sigs self read" on public.nl_contractor_signatures;
create policy "contractor sigs self read" on public.nl_contractor_signatures for select to authenticated using (user_id = auth.uid());

-- Fill the agreement's blanks for one contractor
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
  out := replace(out, '{{commission_terms}}', h.commission_terms);
  out := replace(out, '{{effective_date}}', to_char(p_date, 'FMMonth FMDD, YYYY'));
  return out;
end $$;

-- The signed-in rep's packet. Links the account to the hire row by email the first time.
create or replace function public.nl_contractor_my_packet()
returns jsonb language plpgsql security definer set search_path = public as $$
declare h record; em text; docs jsonb;
begin
  if auth.uid() is null then return null; end if;
  select * into h from nl_contractor_hires where user_id = auth.uid() and status <> 'ended' order by created_at desc limit 1;
  if h is null then
    select lower(email) into em from auth.users where id = auth.uid();
    select * into h from nl_contractor_hires where lower(email) = em and status <> 'ended' and user_id is null order by created_at desc limit 1;
    if h is null then return null; end if;
    update nl_contractor_hires set user_id = auth.uid(), updated_at = now() where id = h.id;
    h.user_id := auth.uid();
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'doc_id', d.id, 'slug', d.slug, 'version', d.version, 'title', d.title,
      'body', nl_contractor_render(h.id, d.id),
      'body_sha256', encode(extensions.digest(nl_contractor_render(h.id, d.id), 'sha256'), 'hex'),
      'signature', (select jsonb_build_object('id', g.id, 'signed_at', g.signed_at, 'typed_name', g.typed_name, 'doc_version', g.doc_version, 'body', g.body_snapshot, 'body_sha256', g.body_sha256)
                    from nl_contractor_signatures g where g.hire_id = h.id and g.doc_slug = d.slug order by g.signed_at desc limit 1)
    ) order by d.slug), '[]'::jsonb)
  into docs
  from nl_contractor_docs d
  where d.active and d.version = (select max(version) from nl_contractor_docs x where x.slug = d.slug and x.active);
  return jsonb_build_object('hire', jsonb_build_object('id', h.id, 'full_name', h.full_name, 'business_name', h.business_name, 'state_code', h.state_code,
      'status', h.status, 'w9_received_at', h.w9_received_at), 'docs', docs);
end $$;

-- Sign. The text is rebuilt on the server and must match what the rep was shown.
create or replace function public.nl_contractor_sign(p_doc_id uuid, p_typed_name text, p_consent boolean, p_body_sha256 text, p_user_agent text)
returns uuid language plpgsql security definer set search_path = public as $$
declare h record; d record; body text; sha text; sid uuid; ip text; remaining int;
begin
  if not coalesce(p_consent, false) then raise exception 'Please agree to sign electronically first.'; end if;
  if length(trim(coalesce(p_typed_name, ''))) < 3 then raise exception 'Type your full legal name to sign.'; end if;
  select * into h from nl_contractor_hires where user_id = auth.uid() and status <> 'ended' order by created_at desc limit 1;
  if h is null then raise exception 'No paperwork found for your account.'; end if;
  select * into d from nl_contractor_docs where id = p_doc_id and active
    and version = (select max(version) from nl_contractor_docs x where x.slug = nl_contractor_docs.slug and x.active);
  if d is null then raise exception 'That agreement is no longer current. Refresh the page.'; end if;
  body := nl_contractor_render(h.id, d.id);
  sha := encode(extensions.digest(body, 'sha256'), 'hex');
  if sha <> p_body_sha256 then raise exception 'The agreement changed since you opened it. Refresh the page and read it again.'; end if;
  begin
    ip := split_part(coalesce((current_setting('request.headers', true)::json)->>'x-forwarded-for', ''), ',', 1);
  exception when others then ip := null; end;
  insert into nl_contractor_signatures (hire_id, user_id, doc_id, doc_slug, doc_version, doc_title, body_snapshot, body_sha256, typed_name, esign_consent, ip, user_agent)
  values (h.id, auth.uid(), d.id, d.slug, d.version, d.title, body, sha, trim(p_typed_name), true, nullif(trim(ip), ''), left(p_user_agent, 400))
  returning id into sid;
  select count(*) into remaining from nl_contractor_docs x
   where x.active and x.version = (select max(version) from nl_contractor_docs y where y.slug = x.slug and y.active)
     and not exists (select 1 from nl_contractor_signatures g where g.hire_id = h.id and g.doc_id = x.id);
  if remaining = 0 and h.status = 'invited' then
    update nl_contractor_hires set status = case when w9_received_at is not null then 'active' else 'signed' end, updated_at = now() where id = h.id;
  end if;
  return sid;
end $$;

revoke all on function public.nl_contractor_render(uuid, uuid, date) from public, anon;
revoke all on function public.nl_contractor_my_packet() from public, anon;
revoke all on function public.nl_contractor_sign(uuid, text, boolean, text, text) from public, anon;
grant execute on function public.nl_contractor_render(uuid, uuid, date) to authenticated;
grant execute on function public.nl_contractor_my_packet() to authenticated;
grant execute on function public.nl_contractor_sign(uuid, text, boolean, text, text) to authenticated;
