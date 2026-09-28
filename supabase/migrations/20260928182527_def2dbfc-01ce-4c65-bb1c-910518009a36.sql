-- Public booking page availability: expose only the booked time ranges for a
-- booking-active BDR calendar. bdr_calendar_events RLS hides all rows from
-- anon visitors, so the public booking page cannot query events directly;
-- this security-definer RPC returns start/end times only (no titles, notes,
-- or contact details) and only when the calendar is accepting bookings.
create or replace function public.get_public_bdr_booked_slots(
  _calendar_id uuid,
  _from timestamptz,
  _to timestamptz
)
returns table (_starts_at timestamptz, _ends_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select e.starts_at as _starts_at, e.ends_at as _ends_at
  from public.bdr_calendar_events e
  join public.bdr_calendars c on c.id = e.calendar_id
  where e.calendar_id = _calendar_id
    and c.booking_active = true
    and e.starts_at >= _from
    and e.starts_at <= _to
    and coalesce(e.attendance, '') <> 'rescheduled';
$$;

revoke all on function public.get_public_bdr_booked_slots(uuid, timestamptz, timestamptz) from public;
grant execute on function public.get_public_bdr_booked_slots(uuid, timestamptz, timestamptz) to anon, authenticated;
