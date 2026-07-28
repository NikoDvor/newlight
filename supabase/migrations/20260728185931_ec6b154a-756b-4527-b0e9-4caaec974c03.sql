ALTER TABLE public.nl_bdr_leads
  ADD COLUMN IF NOT EXISTS street_address text,
  ADD COLUMN IF NOT EXISTS street_number integer,
  ADD COLUMN IF NOT EXISTS side_of_street text,
  ADD COLUMN IF NOT EXISTS sequence_order integer,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS visit_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS source_type text;