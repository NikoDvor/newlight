-- Meeting-link bookings (/bdr/meet/:slug) attach to the salesman's existing lead (matched by email or phone) as a
-- follow-up of the right kind, so they count in meeting stats. Source stays 'manual' so the confirmation function
-- never provisions a client workspace for them.
create or replace function public.nl_digits(_t text) returns text language sql immutable as $$
  select nullif(right(regexp_replace(coalesce(_t, ''), '\D', '', 'g'), 10), '')
$$;

create or replace function public.bdr_events_0_link_meeting_lead()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare l record; em text; ph text; k text; has_deal_paid boolean;
begin
  if new.lead_id is not null or coalesce(new.metadata->>'via', '') <> 'meeting_link' then return new; end if;
  em := lower(nullif(trim(new.metadata->>'email'), ''));
  ph := nl_digits(new.metadata->>'phone');
  if em is null and ph is null then return new; end if;
  select x.* into l from nl_bdr_leads x
  where x.user_id = new.user_id
    and ((em is not null and lower(x.email) = em)
      or (ph is not null and ph in (nl_digits(x.phone), nl_digits(x.owner_direct_phone), nl_digits(x.front_desk_phone), nl_digits(x.phone_normalized))))
    and exists (select 1 from bdr_calendar_events e where e.lead_id = x.id and e.meeting_kind in ('discovery', 'closing', 'onboarding', 'check_in'))
  order by x.updated_at desc nulls last limit 1;
  if l.id is null then return new; end if;
  select coalesce(d.pay_sign_status = 'paid_signed', false) into has_deal_paid from crm_deals d where d.id = l.crm_deal_id;
  k := case
    when coalesce(has_deal_paid, false) or l.pipeline_stage = 'won' then 'check_in'
    when l.pipeline_stage = 'hot' or l.crm_deal_id is not null then 'closing'
    else 'discovery' end;
  new.lead_id := l.id;
  new.meeting_kind := k;
  new.is_extra := true;
  new.extra_type := case k when 'closing' then 'closing_followup' when 'check_in' then 'check_in' else 'discovery_followup' end;
  -- keep source = 'manual': the confirmation function must never set up a client workspace for these
  new.metadata := new.metadata || jsonb_build_object('extra_type', new.extra_type, 'linked_by', 'meeting_link');
  return new;
end $function$;
drop trigger if exists bdr_events_0_link_meeting_lead on public.bdr_calendar_events;
create trigger bdr_events_0_link_meeting_lead before insert on public.bdr_calendar_events
for each row execute function public.bdr_events_0_link_meeting_lead();

create or replace function public.bdr_events_link_pending_followup()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if new.lead_id is null or not coalesce(new.is_extra, false) or coalesce(new.reschedule_count, 0) > 0 then return new; end if;
  update bdr_meeting_outcomes o set next_event_id = new.id
  where o.id = (select id from bdr_meeting_outcomes
                where lead_id = new.lead_id and result = 'another_meeting' and next_event_id is null
                  and meeting_kind = case when new.meeting_kind = 'check_in' then meeting_kind else new.meeting_kind end
                order by logged_at desc limit 1);
  return new;
end $function$;
drop trigger if exists bdr_events_link_pending_followup on public.bdr_calendar_events;
create trigger bdr_events_link_pending_followup after insert on public.bdr_calendar_events
for each row execute function public.bdr_events_link_pending_followup();
