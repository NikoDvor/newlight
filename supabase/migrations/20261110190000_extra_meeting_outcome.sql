-- "Wants another meeting first": a lead attends but isn't ready for the next form, so another meeting of the same
-- kind is booked. Not a reschedule. Tracked separately so close rates can count extra meetings needed per stage.
alter table public.bdr_calendar_events add column if not exists followup_number int not null default 0;
alter table public.bdr_meeting_outcomes add column if not exists followup_number int not null default 0;
alter table public.bdr_meeting_outcomes drop constraint if exists bdr_meeting_outcomes_result_check;
alter table public.bdr_meeting_outcomes add constraint bdr_meeting_outcomes_result_check check (result in ('won', 'rescheduled', 'lost', 'another_meeting'));

create or replace function public.bdr_events_set_kind_attempt()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if new.meeting_kind is null then new.meeting_kind := public.bdr_event_meeting_kind_from_source(new.source); end if;
  -- Attempt = which try at THIS meeting (1 = first booking, 2 = after one reschedule/no-show, ...).
  if new.meeting_kind is not null and new.lead_id is not null and new.attempt_number is null then
    new.attempt_number := 1 + coalesce(new.reschedule_count, 0);
  end if;
  -- Follow-up number = extra meetings of the same kind the lead wanted before the next form (0 = the form's own meeting).
  if coalesce(new.is_extra, false) and new.lead_id is not null and coalesce(new.followup_number, 0) = 0
     and coalesce(new.reschedule_count, 0) = 0 and new.meeting_kind in ('discovery', 'closing', 'onboarding', 'check_in') then
    select 1 + count(*) into new.followup_number from public.bdr_calendar_events
    where lead_id = new.lead_id and meeting_kind = new.meeting_kind and coalesce(is_extra, false) and coalesce(reschedule_count, 0) = 0;
  end if;
  if new.lead_id is not null and new.meeting_kind in ('discovery', 'closing', 'onboarding', 'check_in') then
    select 1 + count(*) into new.meeting_sequence from public.bdr_calendar_events
    where lead_id = new.lead_id and meeting_kind in ('discovery', 'closing', 'onboarding', 'check_in');
  end if;
  return new;
end $function$;

create or replace function public.bdr_outcomes_copy_event_meta()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare e record;
begin
  select followup_number, meeting_sequence, attempt_number into e from public.bdr_calendar_events where id = new.event_id;
  if found then
    new.followup_number := coalesce(nullif(new.followup_number, 0), e.followup_number, 0);
    new.meeting_sequence := coalesce(new.meeting_sequence, e.meeting_sequence);
    new.attempt_number := coalesce(new.attempt_number, e.attempt_number, 1);
  end if;
  return new;
end $function$;
drop trigger if exists bdr_outcomes_copy_event_meta on public.bdr_meeting_outcomes;
create trigger bdr_outcomes_copy_event_meta before insert on public.bdr_meeting_outcomes
for each row execute function public.bdr_outcomes_copy_event_meta();

update public.bdr_calendar_events set attempt_number = 1 + coalesce(reschedule_count, 0)
where meeting_kind is not null and lead_id is not null and attempt_number is distinct from 1 + coalesce(reschedule_count, 0);
