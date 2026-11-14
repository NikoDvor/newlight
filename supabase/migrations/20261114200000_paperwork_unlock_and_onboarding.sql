-- Nov 14, 2026: paperwork no longer limits anything; per-salesman onboarding checklist.

create or replace function public.nl_contractor_sell_block_reason(p_uid uuid)
returns text language plpgsql stable security definer set search_path to 'public' as $function$
declare h public.nl_contractor_hires; em text;
begin
  if p_uid is null then return null; end if;
  select lower(email) into em from auth.users where id = p_uid;
  select * into h from nl_contractor_hires where user_id = p_uid or (user_id is null and lower(email) = em) order by created_at desc limit 1;
  if h.id is null then return null; end if;
  -- Paperwork no longer limits anything: a rep can do everything before and after signing. Only an ended agreement blocks.
  if h.status = 'ended' then return 'Your agreement with NewLight has ended.'; end if;
  return null;
end $function$;

create table if not exists public.nl_rep_onboarding_items (
  user_id uuid not null, item_key text not null, done boolean not null default true,
  done_at timestamptz not null default now(), done_by uuid, primary key (user_id, item_key));
create table if not exists public.nl_rep_onboarding_status (
  user_id uuid primary key, completed_at timestamptz not null default now(), completed_by uuid);
alter table public.nl_rep_onboarding_items enable row level security;
alter table public.nl_rep_onboarding_status enable row level security;
create policy "onboarding items admin" on public.nl_rep_onboarding_items for all to authenticated
  using (private.is_admin_or_operator(auth.uid())) with check (private.is_admin_or_operator(auth.uid()));
create policy "onboarding status admin" on public.nl_rep_onboarding_status for all to authenticated
  using (private.is_admin_or_operator(auth.uid())) with check (private.is_admin_or_operator(auth.uid()));

create or replace function public.nl_rep_onboarding(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare h nl_contractor_hires; em text; st nl_rep_onboarding_status; items jsonb := '[]'::jsonb;
  defs text[][] := array[
   ['logged_in','Logged in at least once'],['contractor','Contractor record added'],['docs','Paperwork signed'],['w9','W-9 received'],
   ['territory','Territory assigned'],['calendar','Booking calendar set up'],['training','Started training'],['leads','Leads pulled'],
   ['first_dial','First call made'],['walkthrough','Walkthrough done (Dialer, My Leads, Calculator)'],
   ['roleplay','Role-played the call script with you'],['tools','Added to team chat and shared tools']];
  i int; k text; auto boolean; man boolean;
begin
  if not private.is_admin_or_operator(auth.uid()) then raise exception 'Admins only'; end if;
  select lower(email) into em from auth.users where id = p_user;
  select * into h from nl_contractor_hires where user_id = p_user or (user_id is null and lower(email) = em) order by created_at desc limit 1;
  for i in 1 .. array_length(defs, 1) loop
    k := defs[i][1];
    auto := case k
      when 'logged_in' then exists (select 1 from auth.users u where u.id = p_user and u.last_sign_in_at is not null)
      when 'contractor' then h.id is not null
      when 'docs' then coalesce(h.status in ('signed','active'), false)
      when 'w9' then h.w9_received_at is not null
      when 'territory' then exists (select 1 from nl_lead_territories t where t.rep_user_id = p_user and t.active)
      when 'calendar' then exists (select 1 from bdr_calendars c where c.user_id = p_user)
      when 'training' then exists (select 1 from nl_training_progress p where p.user_id = p_user)
      when 'leads' then exists (select 1 from nl_bdr_leads l where l.user_id = p_user)
      when 'first_dial' then exists (select 1 from nl_bdr_dial_log d where d.bdr_user_id = p_user)
      else false end;
    select exists (select 1 from nl_rep_onboarding_items o where o.user_id = p_user and o.item_key = k and o.done) into man;
    items := items || jsonb_build_object('key', k, 'label', defs[i][2], 'auto', auto, 'manual', man, 'done', auto or man,
                                         'can_tick', k in ('walkthrough','roleplay','tools') or not auto);
  end loop;
  select * into st from nl_rep_onboarding_status where user_id = p_user;
  return jsonb_build_object('items', items, 'completed_at', st.completed_at, 'completed_by', st.completed_by);
end $$;

create or replace function public.nl_rep_onboarding_set(p_user uuid, p_key text, p_done boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not private.is_admin_or_operator(auth.uid()) then raise exception 'Admins only'; end if;
  if p_done then
    insert into nl_rep_onboarding_items(user_id, item_key, done, done_at, done_by) values (p_user, p_key, true, now(), auth.uid())
    on conflict (user_id, item_key) do update set done = true, done_at = now(), done_by = auth.uid();
  else
    delete from nl_rep_onboarding_items where user_id = p_user and item_key = p_key;
    delete from nl_rep_onboarding_status where user_id = p_user;
  end if;
end $$;

create or replace function public.nl_rep_onboarding_complete(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s jsonb;
begin
  if not private.is_admin_or_operator(auth.uid()) then raise exception 'Admins only'; end if;
  s := public.nl_rep_onboarding(p_user);
  if exists (select 1 from jsonb_array_elements(s->'items') i where not (i->>'done')::boolean) then raise exception 'Finish every item first'; end if;
  insert into nl_rep_onboarding_status(user_id, completed_at, completed_by) values (p_user, now(), auth.uid())
  on conflict (user_id) do update set completed_at = now(), completed_by = auth.uid();
end $$;

create or replace function public.nl_rep_onboarding_summary()
returns table (user_id uuid, done int, total int, completed_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare r record; s jsonb;
begin
  if not private.is_admin_or_operator(auth.uid()) then raise exception 'Admins only'; end if;
  for r in select ur.user_id as uid from user_roles ur where ur.role = 'marketing_staff' loop
    s := public.nl_rep_onboarding(r.uid);
    user_id := r.uid;
    done := (select count(*) from jsonb_array_elements(s->'items') i where (i->>'done')::boolean);
    total := jsonb_array_length(s->'items');
    completed_at := nullif(s->>'completed_at','')::timestamptz;
    return next;
  end loop;
end $$;

revoke all on function public.nl_rep_onboarding(uuid) from public, anon;
grant execute on function public.nl_rep_onboarding(uuid) to authenticated;
revoke all on function public.nl_rep_onboarding_set(uuid, text, boolean) from public, anon;
grant execute on function public.nl_rep_onboarding_set(uuid, text, boolean) to authenticated;
revoke all on function public.nl_rep_onboarding_complete(uuid) from public, anon;
grant execute on function public.nl_rep_onboarding_complete(uuid) to authenticated;
revoke all on function public.nl_rep_onboarding_summary() from public, anon;
grant execute on function public.nl_rep_onboarding_summary() to authenticated;
