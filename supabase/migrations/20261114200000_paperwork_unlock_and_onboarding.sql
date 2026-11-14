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

-- nl_rep_onboarding(uuid), nl_rep_onboarding_set(uuid,text,boolean), nl_rep_onboarding_complete(uuid) and
-- nl_rep_onboarding_summary() were created live; see the app (components/admin/RepOnboarding.tsx) for how they are used.
-- Steps: logged in, contractor record, paperwork signed, W-9, territory, calendar, training started, leads pulled,
-- first call (all detected automatically) + walkthrough, role-play, tools (ticked by hand). Any step can also be ticked by hand.
