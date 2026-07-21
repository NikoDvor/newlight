
ALTER TABLE public.nl_bdr_leads
  ADD COLUMN IF NOT EXISTS booking_system_exists boolean,
  ADD COLUMN IF NOT EXISTS owner_calendar_confirmed boolean,
  ADD COLUMN IF NOT EXISTS owner_booking_link_send_ready text;

UPDATE public.nl_bdr_leads
   SET booking_system_exists = COALESCE(booking_system_exists, has_booking_system),
       owner_calendar_confirmed = COALESCE(owner_calendar_confirmed, booking_link_is_owner),
       owner_booking_link_send_ready = COALESCE(owner_booking_link_send_ready, owner_booking_link);
