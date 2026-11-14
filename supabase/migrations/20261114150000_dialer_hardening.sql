-- Nov 14, 2026 dialer audit fixes.
-- 1) nl_mark_dnc: staff only, and a rep can only flag contacts at firms they own (admins any).
create or replace function public.nl_mark_dnc(_phone text, _contact_id uuid default null, _reason text default null)
returns void language plpgsql security definer set search_path to 'public' as $$
declare _n text := public.nl_phone10(_phone); _uid uuid := auth.uid();
begin
  if _uid is null then raise exception 'Not signed in'; end if;
  if not private.is_internal_staff(_uid) then raise exception 'Not allowed'; end if;
  if _contact_id is not null and not private.is_admin_or_operator(_uid) then
    if not exists (select 1 from nl_lead_pool_contacts c join nl_lead_pool_firms f on f.id = c.firm_id where c.id = _contact_id and f.owner_rep_id = _uid) then
      raise exception 'Not your contact';
    end if;
  end if;
  if _n is not null then
    insert into nl_dnc_numbers(phone_normalized, reason, contact_id, added_by) values (_n, _reason, _contact_id, _uid)
    on conflict (phone_normalized) do nothing;
  end if;
  if _contact_id is not null then update nl_lead_pool_contacts set do_not_call = true, updated_at = now() where id = _contact_id; end if;
end $$;

-- 2) Front-desk DNC must check the number the dialer actually shows (firm main phone first).
do $$ declare d text; begin
  select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'nl_dialer_lead_details';
  d := replace(d, 'exists(select 1 from nl_dnc_numbers d where d.phone_normalized = public.nl_phone10(coalesce(l.front_desk_phone,l.phone)))',
                  'exists(select 1 from nl_dnc_numbers d where d.phone_normalized in (public.nl_phone10(f.main_phone), public.nl_phone10(l.front_desk_phone), public.nl_phone10(l.phone)))');
  execute d;
end $$;

-- 3) list_lead_conflicts only answers for the caller's own leads.
do $$ declare d text; begin
  select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'list_lead_conflicts';
  d := replace(d, 'WHERE me.id = ANY(_lead_ids)', 'WHERE me.id = ANY(_lead_ids) AND me.user_id = auth.uid()');
  execute d;
end $$;

-- 4) DNC check for any phone numbers (non-pool leads have no firm record).
create or replace function public.nl_dnc_flags(_phones text[])
returns setof text language sql stable security definer set search_path to 'public' as $$
  select d.phone_normalized from nl_dnc_numbers d
  where private.is_internal_staff(auth.uid())
    and d.phone_normalized in (select public.nl_phone10(p) from unnest(_phones) p where public.nl_phone10(p) is not null);
$$;
revoke all on function public.nl_dnc_flags(text[]) from public, anon;
grant execute on function public.nl_dnc_flags(text[]) to authenticated;
