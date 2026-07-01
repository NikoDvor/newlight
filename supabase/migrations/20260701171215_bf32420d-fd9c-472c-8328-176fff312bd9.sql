ALTER TABLE public.bdr_calendars
  DROP CONSTRAINT IF EXISTS bdr_calendars_booking_form_id_fkey;

ALTER TABLE public.bdr_calendars
  ADD CONSTRAINT bdr_calendars_booking_form_id_fkey
  FOREIGN KEY (booking_form_id) REFERENCES public.client_forms(id) ON DELETE SET NULL;