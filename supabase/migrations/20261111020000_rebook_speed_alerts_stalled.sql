-- 1) No-show rebook: a meeting-link booking from a lead whose last meeting is waiting on a rebook
--    (logged "rescheduled" with no new time) is filed as the NEXT TRY of that same meeting, not an extra meeting.
create or replace function public.bdr_events_0_link_meeting_lead()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare l record; em text; ph text; k text; has_deal_paid boolean; pend record; prev record;
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
  new.lead_id := l.id;

  -- Waiting on a rebook or an extra meeting? The newest unlinked outcome decides.
  select o.* into pend from bdr_meeting_outcomes o
  where o.lead_id = l.id and o.next_event_id is null and o.result in ('rescheduled', 'another_meeting')
  order by o.logged_at desc limit 1;
  if pend.id is not null and pend.result = 'rescheduled' then
    select * into prev from bdr_calendar_events where id = pend.event_id;
    new.meeting_kind := coalesce(prev.meeting_kind, pend.meeting_kind);
    new.is_extra := coalesce(prev.is_extra, false);
    new.extra_type := prev.extra_type;
    new.followup_number := coalesce(prev.followup_number, 0);
    new.reschedule_count := coalesce(prev.reschedule_count, 0) + 1;
    new.metadata := new.metadata || jsonb_build_object('linked_by', 'rebook_link', 'rebook_of', prev.id);
    return new;
  end if;

  select coalesce(d.pay_sign_status = 'paid_signed', false) into has_deal_paid from crm_deals d where d.id = l.crm_deal_id;
  k := case
    when coalesce(has_deal_paid, false) or l.pipeline_stage = 'won' then 'check_in'
    when l.pipeline_stage = 'hot' or l.crm_deal_id is not null then 'closing'
    else 'discovery' end;
  new.meeting_kind := k;
  new.is_extra := true;
  new.extra_type := case k when 'closing' then 'closing_followup' when 'check_in' then 'check_in' else 'discovery_followup' end;
  -- keep source = 'manual': the confirmation function must never set up a client workspace for these
  new.metadata := new.metadata || jsonb_build_object('extra_type', new.extra_type, 'linked_by', 'meeting_link');
  return new;
end $function$;

-- Link the booking to the waiting outcome (reschedule or extra meeting), and stop the 72-hour clock on a rebook.
create or replace function public.bdr_events_link_pending_followup()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare pend record;
begin
  if new.lead_id is null or coalesce(new.metadata->>'via', '') <> 'meeting_link' then
    -- extra meetings booked in the app link to the newest "another meeting" outcome of the same kind
    if new.lead_id is null or not coalesce(new.is_extra, false) or coalesce(new.reschedule_count, 0) > 0 then return new; end if;
  end if;
  select o.* into pend from bdr_meeting_outcomes o
  where o.lead_id = new.lead_id and o.next_event_id is null
    and (o.result = 'another_meeting' or (o.result = 'rescheduled' and new.metadata->>'linked_by' = 'rebook_link'))
  order by o.logged_at desc limit 1;
  if pend.id is not null then
    update bdr_meeting_outcomes set next_event_id = new.id where id = pend.id;
    if pend.result = 'rescheduled' then
      update nl_bdr_leads set unattended_since = null, unattended_return_stage = null, unattended_warned_at = null where id = new.lead_id;
    end if;
  end if;
  return new;
end $function$;

-- 2) Speed alerts: one alert per thing (the function checks every 5 minutes).
create table if not exists public.nl_speed_alerts (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  ref_id text not null,
  created_at timestamptz not null default now(),
  unique (kind, ref_id)
);
alter table public.nl_speed_alerts enable row level security;
drop policy if exists admin_read on public.nl_speed_alerts;
create policy admin_read on public.nl_speed_alerts for select using (private.is_admin_or_operator(auth.uid()));

select cron.unschedule('nl-speed-alerts-5min') where exists (select 1 from cron.job where jobname = 'nl-speed-alerts-5min');
select cron.schedule('nl-speed-alerts-5min', '*/5 * * * *', $c$
  select net.http_post(
    url := 'https://irvrmkshjcyabjubihmp.supabase.co/functions/v1/nl-speed-alerts',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'CRON_SECRET' limit 1)),
    body := '{}'::jsonb)
$c$);

-- 3) Stalled hot deals: Form 2 done 30+ days ago (proposal expired), not paid and signed, no meeting coming up,
--    and nothing logged in 14 days → lost, reason "Went silent". Daily.
create or replace function public.nl_close_stalled_deals()
returns int language plpgsql security definer set search_path = public as $$
declare r record; n int := 0; ev record;
begin
  for r in
    select l.id lead_id, l.user_id, l.outcome_history, d.id deal_id
    from nl_bdr_leads l join crm_deals d on d.id = l.crm_deal_id
    where l.pipeline_stage = 'hot'
      and coalesce(d.pay_sign_status, '') <> 'paid_signed'
      and coalesce(d.status, '') not in ('lost', 'won')
      and d.close_prep_completed_at < now() - interval '30 days'
      and not exists (select 1 from bdr_calendar_events e where e.lead_id = l.id and e.starts_at > now()
                      and coalesce(e.attendance, 'pending') not in ('rescheduled', 'cancelled'))
      and not exists (select 1 from bdr_calendar_events e where e.lead_id = l.id and e.starts_at > now() - interval '14 days'
                      and e.meeting_kind is not null)
      and not exists (select 1 from bdr_meeting_outcomes o where o.lead_id = l.id and o.logged_at > now() - interval '14 days')
  loop
    -- record it on the latest closing meeting that has no outcome yet, so meeting stats count the loss
    select e.* into ev from bdr_calendar_events e
    where e.lead_id = r.lead_id and e.meeting_kind = 'closing'
      and not exists (select 1 from bdr_meeting_outcomes o where o.event_id = e.id)
    order by e.starts_at desc limit 1;
    if ev.id is not null then
      insert into bdr_meeting_outcomes (event_id, lead_id, rep_user_id, meeting_kind, attendance, result, primary_lost_reason, lost_reasons, notes)
      values (ev.id, r.lead_id, r.user_id, 'closing', null, 'lost', 'went_silent', array['went_silent'],
              'Closed automatically: proposal expired (30 days) and no activity for 14 days.')
      on conflict do nothing;
    end if;
    update nl_bdr_leads set status = 'closed_lost', pipeline_stage = 'cold',
      outcome_history = coalesce(outcome_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'label', 'Lost — went silent (auto-closed: proposal expired, no activity 14 days)', 'timestamp', now(), 'meeting_kind', 'closing'))
    where id = r.lead_id;
    update crm_deals set status = 'lost', lost_at = now(), lost_reason = 'went_silent' where id = r.deal_id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.nl_close_stalled_deals() from public, anon, authenticated;
select cron.unschedule('nl-close-stalled-deals-daily') where exists (select 1 from cron.job where jobname = 'nl-close-stalled-deals-daily');
select cron.schedule('nl-close-stalled-deals-daily', '40 10 * * *', $c$select public.nl_close_stalled_deals();$c$);
