-- 24/7 availability defaults for BDR and standard calendars

ALTER TABLE public.bdr_calendars
  ALTER COLUMN availability SET DEFAULT
    '{"sun": {"end": "23:59", "start": "00:00", "enabled": true},
      "mon": {"end": "23:59", "start": "00:00", "enabled": true},
      "tue": {"end": "23:59", "start": "00:00", "enabled": true},
      "wed": {"end": "23:59", "start": "00:00", "enabled": true},
      "thu": {"end": "23:59", "start": "00:00", "enabled": true},
      "fri": {"end": "23:59", "start": "00:00", "enabled": true},
      "sat": {"end": "23:59", "start": "00:00", "enabled": true}}'::jsonb;

ALTER TABLE public.availability_settings
  ALTER COLUMN start_time SET DEFAULT '00:00:00'::time,
  ALTER COLUMN end_time SET DEFAULT '23:59:00'::time,
  ALTER COLUMN enabled SET DEFAULT true;

-- Backfill existing rows to 24/7
UPDATE public.bdr_calendars
SET availability = '{"sun": {"end": "23:59", "start": "00:00", "enabled": true},
                    "mon": {"end": "23:59", "start": "00:00", "enabled": true},
                    "tue": {"end": "23:59", "start": "00:00", "enabled": true},
                    "wed": {"end": "23:59", "start": "00:00", "enabled": true},
                    "thu": {"end": "23:59", "start": "00:00", "enabled": true},
                    "fri": {"end": "23:59", "start": "00:00", "enabled": true},
                    "sat": {"end": "23:59", "start": "00:00", "enabled": true}}'::jsonb;

UPDATE public.availability_settings
SET start_time = '00:00:00', end_time = '23:59:00', enabled = true;

-- Seed missing weekend rows for existing clients so all 7 days are represented
INSERT INTO public.availability_settings (client_id, day_of_week, enabled, start_time, end_time)
SELECT DISTINCT s.client_id, d.dow, true, '00:00:00'::time, '23:59:00'::time
FROM public.availability_settings s
CROSS JOIN (VALUES (0),(1),(2),(3),(4),(5),(6)) AS d(dow)
WHERE NOT EXISTS (
  SELECT 1 FROM public.availability_settings s2
  WHERE s2.client_id = s.client_id AND s2.day_of_week = d.dow
);