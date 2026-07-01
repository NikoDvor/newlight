GRANT SELECT ON public.bdr_calendars TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bdr_calendars TO authenticated;
GRANT ALL ON public.bdr_calendars TO service_role;