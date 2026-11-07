-- Reps share one internal workspace (the NewLight ops tenant). The old tenant policies let any rep read and edit every
-- other rep's leads and call outcomes. In the ops tenant a lead is visible/editable only to its owner or an admin/operator.
-- Client workspaces (their own sales teams) keep the existing tenant rules.
-- Ops tenant id: 00000000-0000-0000-0000-0000000000ff

drop policy if exists tenant_select_leads on public.nl_bdr_leads;
create policy tenant_select_leads on public.nl_bdr_leads for select to authenticated
  using (
    user_can_access_client(auth.uid(), client_id)
    and (client_id <> '00000000-0000-0000-0000-0000000000ff'::uuid or auth.uid() = user_id or private.is_admin_or_operator(auth.uid()))
  );

drop policy if exists tenant_update_leads on public.nl_bdr_leads;
create policy tenant_update_leads on public.nl_bdr_leads for update to authenticated
  using (user_can_access_client(auth.uid(), client_id) and (auth.uid() = user_id or private.is_admin_or_operator(auth.uid())))
  with check (user_can_access_client(auth.uid(), client_id) and (auth.uid() = user_id or private.is_admin_or_operator(auth.uid())));

drop policy if exists tenant_select_call_outcomes on public.bdr_call_outcomes;
create policy tenant_select_call_outcomes on public.bdr_call_outcomes for select to authenticated
  using (
    user_can_access_client(auth.uid(), client_id)
    and (client_id <> '00000000-0000-0000-0000-0000000000ff'::uuid or auth.uid() = bdr_user_id or private.is_admin_or_operator(auth.uid()))
  );
