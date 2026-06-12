CREATE TABLE public.seo_run_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by TEXT NOT NULL,
  clients_processed INTEGER NOT NULL DEFAULT 0,
  total_keywords INTEGER NOT NULL DEFAULT 0,
  total_content INTEGER NOT NULL DEFAULT 0,
  total_issues INTEGER NOT NULL DEFAULT 0,
  total_locations INTEGER NOT NULL DEFAULT 0,
  failures JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.seo_run_log TO authenticated;
GRANT ALL ON public.seo_run_log TO service_role;

ALTER TABLE public.seo_run_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to select all seo_run_log rows"
  ON public.seo_run_log
  FOR SELECT
  TO authenticated
  USING (true);