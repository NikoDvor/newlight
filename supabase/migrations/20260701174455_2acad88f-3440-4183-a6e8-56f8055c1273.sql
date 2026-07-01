-- Allow anonymous visitors to read active BDR booking calendars by slug OR id.
CREATE POLICY "Anon can read active bdr_calendars"
ON public.bdr_calendars
FOR SELECT
TO anon
USING (booking_active = true);

GRANT SELECT ON public.bdr_calendars TO anon;