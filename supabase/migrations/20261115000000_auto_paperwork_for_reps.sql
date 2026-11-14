-- Paperwork shows up the moment a salesman account exists; admins can see it per account.
drop function if exists public.nl_contractor_set_profile(text, text, text, text, text);
create or replace function public.nl_contractor_set_profile(p_address text, p_phone text, p_city text, p_entity text, p_business text,
                                                            p_state text default null, p_full_name text default null)
returns void language plpgsql security definer set search_path = public as $$
declare hid uuid := nl_contractor_my_hire_id(); st text := upper(nullif(trim(p_state), ''));
begin
  if hid is null then raise exception 'No paperwork found for your account.'; end if;
  if length(trim(coalesce(p_address, ''))) < 8 then raise exception 'Enter your full mailing address.'; end if;
  if length(trim(coalesce(p_city, ''))) < 2 then raise exception 'Enter the city you work from.'; end if;
  if p_full_name is not null and length(trim(p_full_name)) < 3 then raise exception 'Enter your full legal name.'; end if;
  if st is not null then
    if not exists (select 1 from nl_contractor_states s where s.state_code = st) then raise exception 'Pick a valid state.'; end if;
    if not exists (select 1 from nl_contractor_states s where s.state_code = st and s.allowed) then
      raise exception 'NewLight can''t engage contractors in that state. Message NewLight.'; end if;
    if exists (select 1 from nl_contractor_signatures g where g.hire_id = hid)
       and st <> (select state_code from nl_contractor_hires where id = hid) then
      raise exception 'You already signed. Message NewLight to change your state.'; end if;
  end if;
  update nl_contractor_hires set mailing_address = trim(p_address), phone = nullif(trim(p_phone), ''), work_city = initcap(trim(p_city)),
    entity_type = nullif(trim(p_entity), ''), business_name = coalesce(nullif(trim(p_business), ''), business_name),
    state_code = coalesce(st, state_code),
    full_name = case when exists (select 1 from nl_contractor_signatures g where g.hire_id = hid) then full_name else coalesce(nullif(trim(p_full_name), ''), full_name) end,
    updated_at = now()
  where id = hid;
  perform nl_contractor_refresh_status(hid);
end $$;
revoke all on function public.nl_contractor_set_profile(text,text,text,text,text,text,text) from public, anon;
grant execute on function public.nl_contractor_set_profile(text,text,text,text,text,text,text) to authenticated;

-- A new salesman gets a paperwork record automatically (state is confirmed by the rep in step 1).
create or replace function public.nl_contractor_auto_hire() returns trigger
language plpgsql security definer set search_path = public as $$
declare em text; nm text;
begin
  if new.role::text <> 'marketing_staff' then return new; end if;
  select lower(u.email), coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), split_part(u.email, '@', 1)) into em, nm from auth.users u where u.id = new.user_id;
  if em is null then return new; end if;
  if exists (select 1 from nl_contractor_hires h where h.status <> 'ended' and (h.user_id = new.user_id or lower(h.email) = em)) then return new; end if;
  insert into nl_contractor_hires (email, full_name, state_code, commission_terms, user_id, status)
  values (em, nm, 'TX',
    E'- Commission is paid as manual payments by NewLight, in amounts agreed in writing with the Contractor for each client.\n- No commission is owed on a client until NewLight records a payment to the Contractor.\n- Commission is never owed on monthly fees, retainers, ad budgets or revenue the client pays the Company.',
    new.user_id, 'invited');
  return new;
end $$;
drop trigger if exists nl_contractor_auto_hire_trg on public.user_roles;
create trigger nl_contractor_auto_hire_trg after insert on public.user_roles
  for each row execute function public.nl_contractor_auto_hire();

-- Admin view of one rep's paperwork: every document (signed text or the current text), W-9 status and link.
create or replace function public.nl_contractor_admin_packet(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare h public.nl_contractor_hires; em text; docs jsonb; w9 text;
begin
  if not private.is_admin_or_operator(auth.uid()) then raise exception 'Admins only'; end if;
  select lower(email) into em from auth.users where id = p_user;
  select * into h from nl_contractor_hires where (user_id = p_user or (user_id is null and lower(email) = em)) and status <> 'ended' order by created_at desc limit 1;
  if h.id is null then return null; end if;
  select value into w9 from nl_contractor_settings where key = 'w9_upload_url';
  select coalesce(jsonb_agg(jsonb_build_object(
      'doc_id', d.id, 'slug', d.slug, 'title', d.title, 'summary', d.summary, 'version', d.version,
      'body', nl_contractor_render(h.id, d.id),
      'signature', (select jsonb_build_object('signed_at', g.signed_at, 'typed_name', g.typed_name, 'doc_version', g.doc_version, 'body', g.body_snapshot, 'body_sha256', g.body_sha256, 'ip', g.ip)
                    from nl_contractor_signatures g where g.hire_id = h.id and g.doc_slug = d.slug
                      and (d.renew_months is null or g.signed_at > now() - make_interval(months => d.renew_months))
                    order by g.signed_at desc limit 1)
    ) order by d.sort_order, d.slug), '[]'::jsonb)
  into docs
  from nl_contractor_docs d
  where d.active and d.version = (select max(version) from nl_contractor_docs x where x.slug = d.slug and x.active)
    and nl_contractor_doc_applies(d, h);
  return jsonb_build_object('hire', jsonb_build_object('id', h.id, 'full_name', h.full_name, 'email', h.email, 'state_code', h.state_code, 'status', h.status,
      'mailing_address', h.mailing_address, 'work_city', h.work_city, 'w9_requested_at', h.w9_requested_at, 'w9_received_at', h.w9_received_at,
      'countersigned_at', h.countersigned_at, 'countersign_name', h.countersign_name),
    'w9_url', nullif(w9, ''), 'docs', docs);
end $$;
revoke all on function public.nl_contractor_admin_packet(uuid) from public, anon;
grant execute on function public.nl_contractor_admin_packet(uuid) to authenticated;
