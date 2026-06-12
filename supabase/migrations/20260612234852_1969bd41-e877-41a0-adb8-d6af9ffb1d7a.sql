CREATE TABLE IF NOT EXISTS public.seo_performance_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  performance_score integer,
  mobile_score integer,
  lcp_ms integer,
  tbt_ms integer,
  cls numeric(5,3),
  fetched_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.seo_performance_scores TO authenticated;
GRANT ALL ON public.seo_performance_scores TO service_role;

ALTER TABLE public.seo_performance_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select all rows"
ON public.seo_performance_scores
FOR SELECT
TO authenticated
USING (true);