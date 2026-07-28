ALTER TABLE public.street_sweep_visits ADD COLUMN IF NOT EXISTS sequence integer;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY route_id ORDER BY created_at, id) AS rn
  FROM public.street_sweep_visits
)
UPDATE public.street_sweep_visits v
SET sequence = ranked.rn
FROM ranked
WHERE v.id = ranked.id AND v.sequence IS NULL;

CREATE INDEX IF NOT EXISTS street_sweep_visits_route_sequence_idx
  ON public.street_sweep_visits (route_id, sequence);