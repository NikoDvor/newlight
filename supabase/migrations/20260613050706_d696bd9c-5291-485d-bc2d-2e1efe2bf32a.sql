CREATE TABLE public.seo_competitor_gaps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  competitor_domains text NOT NULL,
  keyword_gaps jsonb NOT NULL DEFAULT '[]',
  content_gaps jsonb NOT NULL DEFAULT '[]',
  positioning_opportunities jsonb NOT NULL DEFAULT '[]',
  generated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.seo_competitor_gaps TO authenticated;
GRANT ALL ON public.seo_competitor_gaps TO service_role;

ALTER TABLE public.seo_competitor_gaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read competitor gaps"
ON public.seo_competitor_gaps
FOR SELECT
TO authenticated
USING (true);