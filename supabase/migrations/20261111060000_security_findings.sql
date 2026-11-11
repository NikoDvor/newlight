-- Security findings (Nov 11 2026).
create or replace function private.is_internal_staff(_uid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = _uid and role in ('admin','operator','marketing_staff','support_staff','project_manager'))
$$;
grant execute on function private.is_internal_staff(uuid) to authenticated;

-- Street sweep photos: unused + empty bucket, was open to every signed-in user. Admin only.
drop policy if exists ss_photos_read on storage.objects;
drop policy if exists ss_photos_insert on storage.objects;
drop policy if exists ss_photos_update on storage.objects;
drop policy if exists ss_photos_delete on storage.objects;
create policy ss_photos_admin on storage.objects for all to authenticated
  using (bucket_id = 'street-sweep-photos' and private.is_admin_or_operator(auth.uid()))
  with check (bucket_id = 'street-sweep-photos' and private.is_admin_or_operator(auth.uid()));

-- FL insurance licensee list: only the fl-insurance-search function (service role) reads it.
drop policy if exists "Authenticated users can read FL insurance licensees" on public.fl_insurance_licensees;
create policy "Admins read FL insurance licensees" on public.fl_insurance_licensees for select to authenticated using (private.is_admin_or_operator(auth.uid()));

-- Contractor paperwork/settings/states: NewLight staff only, not client workspace users.
drop policy if exists "contractor docs read" on public.nl_contractor_docs;
create policy "contractor docs read" on public.nl_contractor_docs for select to authenticated using (private.is_internal_staff(auth.uid()));
drop policy if exists "contractor settings read" on public.nl_contractor_settings;
create policy "contractor settings read" on public.nl_contractor_settings for select to authenticated using (private.is_internal_staff(auth.uid()));
drop policy if exists "contractor states read" on public.nl_contractor_states;
create policy "contractor states read" on public.nl_contractor_states for select to authenticated using (private.is_internal_staff(auth.uid()));

-- Intentionally left readable by signed-in users (reference data, no private info): training content, bank holidays,
-- firm types, package defaults (calculator), form templates, SEC services, recommendation links, vertical benchmarks.
