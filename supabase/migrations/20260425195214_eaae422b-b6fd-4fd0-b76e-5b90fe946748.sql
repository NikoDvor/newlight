DROP POLICY IF EXISTS "anon_read_bookable_calendars" ON public.calendars;

CREATE POLICY "anon_read_bookable_calendars"
ON public.calendars
AS PERMISSIVE
FOR SELECT
TO anon
USING (
  is_active = true
  AND EXISTS (
    SELECT 1
    FROM public.calendar_booking_links bl
    WHERE bl.calendar_id = calendars.id
      AND bl.is_active = true
      AND bl.is_public = true
  )
);