ALTER TABLE public.bdr_calendars DROP CONSTRAINT IF EXISTS bdr_calendars_user_id_key;
CREATE INDEX IF NOT EXISTS bdr_calendars_user_id_idx ON public.bdr_calendars(user_id);