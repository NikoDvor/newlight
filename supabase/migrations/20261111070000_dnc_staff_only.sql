-- Security finding: the do-not-call list (phone numbers) was readable by anyone signed in, including client users.
-- Only the send-compliance-text function (service role) reads it in code. NewLight staff only now.
drop policy if exists team_read on public.nl_dnc_numbers;
drop policy if exists team_insert on public.nl_dnc_numbers;
create policy staff_read on public.nl_dnc_numbers for select to authenticated using (private.is_internal_staff(auth.uid()));
create policy staff_insert on public.nl_dnc_numbers for insert to authenticated with check (private.is_internal_staff(auth.uid()) and added_by = auth.uid());
