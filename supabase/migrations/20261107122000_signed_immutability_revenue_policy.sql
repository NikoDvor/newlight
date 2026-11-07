-- Client revenue entries must reference a deal that belongs to that client.
drop policy if exists "attributed revenue client add" on public.nl_attributed_revenue;
create policy "attributed revenue client add" on public.nl_attributed_revenue for insert to authenticated
with check (client_id is not null and entry_kind='client_confirmed' and revenue > 0 and revenue < 10000000
  and private.user_has_client_access(auth.uid(), client_id)
  and (deal_id is null or exists (select 1 from public.crm_deals d where d.id = deal_id and d.provisioned_client_id = nl_attributed_revenue.client_id)));

-- Signed agreements are immutable (envelope, items, signatures).
create or replace function public.guard_signed_envelope() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_table_name='document_envelopes' then
    if tg_op='DELETE' and old.status in ('completed','signed') then raise exception 'Signed agreements cannot be deleted'; end if;
    if tg_op='UPDATE' and old.status in ('completed','signed') and (
       new.terms_sha256 is distinct from old.terms_sha256 or new.terms_version is distinct from old.terms_version
       or new.recipient_email is distinct from old.recipient_email or new.title is distinct from old.title
       or new.share_token is distinct from old.share_token or new.client_id is distinct from old.client_id
       or (new.status not in ('completed','signed','voided')))
    then raise exception 'Signed agreements are immutable'; end if;
  else
    if exists (select 1 from public.document_envelopes e where e.id = coalesce(old.envelope_id, new.envelope_id) and e.status in ('completed','signed')) then
      raise exception 'Signed agreements are immutable';
    end if;
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists guard_signed_envelopes on public.document_envelopes;
create trigger guard_signed_envelopes before update or delete on public.document_envelopes for each row execute function public.guard_signed_envelope();
drop trigger if exists guard_signed_items on public.document_envelope_items;
create trigger guard_signed_items before update or delete on public.document_envelope_items for each row execute function public.guard_signed_envelope();
drop trigger if exists guard_signed_sigs on public.document_envelope_signatures;
create trigger guard_signed_sigs before update or delete on public.document_envelope_signatures for each row execute function public.guard_signed_envelope();
