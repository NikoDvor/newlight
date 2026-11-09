-- Dialer niche filter: fill a lead's niche from its SEC Form ADV focus (sec_adv_services.focus_label by CRD)
-- when the rep hasn't set one. Never overwrites a niche the rep typed or imported.
create or replace function public.nl_bdr_lead_fill_niche()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(new.niche), '') = '' and new.crd is not null then
    select s.focus_label into new.niche from public.sec_adv_services s
    where s.crd = new.crd and s.focus_label is not null limit 1;
  end if;
  return new;
end $$;

drop trigger if exists nl_bdr_lead_fill_niche on public.nl_bdr_leads;
create trigger nl_bdr_lead_fill_niche before insert or update of crd, niche on public.nl_bdr_leads
for each row execute function public.nl_bdr_lead_fill_niche();

-- Backfill existing leads with no niche.
update public.nl_bdr_leads l set niche = s.focus_label
from public.sec_adv_services s
where s.crd = l.crd and s.focus_label is not null and coalesce(trim(l.niche), '') = '';
