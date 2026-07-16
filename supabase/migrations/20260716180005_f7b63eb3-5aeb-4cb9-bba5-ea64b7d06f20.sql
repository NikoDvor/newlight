
CREATE TABLE public.ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  category text,
  title text,
  why_reasoning text,
  expected_impact_value numeric,
  impact_unit text,
  confidence_pct integer,
  effort_level text,
  rice_score numeric,
  status text NOT NULL DEFAULT 'new',
  action_label text,
  generated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_recommendations TO authenticated;
GRANT ALL ON public.ai_recommendations TO service_role;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client users view their recommendations"
ON public.ai_recommendations FOR SELECT TO authenticated
USING (private.user_has_client_access(auth.uid(), client_id) OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Client users update their recommendations"
ON public.ai_recommendations FOR UPDATE TO authenticated
USING (private.user_has_client_access(auth.uid(), client_id) OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert recommendations"
ON public.ai_recommendations FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete recommendations"
ON public.ai_recommendations FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_ai_recommendations_client_status ON public.ai_recommendations(client_id, status);

CREATE TABLE public.vertical_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  industry text NOT NULL,
  metric_key text NOT NULL,
  benchmark_value numeric NOT NULL,
  top_quartile_value numeric,
  unit text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(industry, metric_key)
);

GRANT SELECT ON public.vertical_benchmarks TO authenticated, anon;
GRANT ALL ON public.vertical_benchmarks TO service_role;
ALTER TABLE public.vertical_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Benchmarks readable"
ON public.vertical_benchmarks FOR SELECT TO authenticated, anon
USING (true);

CREATE POLICY "Admins manage benchmarks"
ON public.vertical_benchmarks FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.vertical_benchmarks (industry, metric_key, benchmark_value, top_quartile_value, unit) VALUES
('med_spa', 'cost_per_lead', 30, 19, '$'),
('med_spa', 'lead_response_minutes', 5, 2, 'min'),
('med_spa', 'review_velocity_monthly', 10, 15, 'reviews'),
('med_spa', 'no_show_rate', 15, 8, '%'),
('med_spa', 'conversion_rate', 20, 30, '%'),
('med_spa', 'avg_rating', 4.5, 4.8, 'stars'),
('hvac', 'cost_per_lead', 104, 65, '$'),
('hvac', 'lead_response_minutes', 5, 2, 'min'),
('hvac', 'review_velocity_monthly', 8, 15, 'reviews'),
('hvac', 'no_show_rate', 10, 5, '%'),
('hvac', 'conversion_rate', 25, 40, '%'),
('hvac', 'avg_rating', 4.5, 4.8, 'stars'),
('roofing', 'cost_per_lead', 228, 150, '$'),
('roofing', 'lead_response_minutes', 5, 2, 'min'),
('roofing', 'review_velocity_monthly', 6, 12, 'reviews'),
('roofing', 'no_show_rate', 12, 6, '%'),
('roofing', 'conversion_rate', 3.7, 8, '%'),
('roofing', 'avg_rating', 4.5, 4.8, 'stars'),
('solar', 'cost_per_lead', 206, 130, '$'),
('solar', 'lead_response_minutes', 5, 2, 'min'),
('solar', 'review_velocity_monthly', 5, 10, 'reviews'),
('solar', 'no_show_rate', 15, 8, '%'),
('solar', 'conversion_rate', 10, 12, '%'),
('solar', 'avg_rating', 4.5, 4.8, 'stars'),
('law_firm', 'cost_per_lead', 111, 70, '$'),
('law_firm', 'lead_response_minutes', 5, 2, 'min'),
('law_firm', 'review_velocity_monthly', 5, 10, 'reviews'),
('law_firm', 'no_show_rate', 15, 8, '%'),
('law_firm', 'conversion_rate', 14, 25, '%'),
('law_firm', 'avg_rating', 4.7, 4.9, 'stars'),
('financial_advisor', 'cost_per_lead', 653, 400, '$'),
('financial_advisor', 'lead_response_minutes', 10, 5, 'min'),
('financial_advisor', 'review_velocity_monthly', 3, 8, 'reviews'),
('financial_advisor', 'no_show_rate', 12, 6, '%'),
('financial_advisor', 'conversion_rate', 4.3, 10, '%'),
('financial_advisor', 'avg_rating', 4.7, 4.9, 'stars'),
('salon', 'cost_per_lead', 25, 15, '$'),
('salon', 'lead_response_minutes', 5, 2, 'min'),
('salon', 'review_velocity_monthly', 12, 20, 'reviews'),
('salon', 'no_show_rate', 15, 8, '%'),
('salon', 'conversion_rate', 30, 45, '%'),
('salon', 'avg_rating', 4.6, 4.9, 'stars'),
('default', 'cost_per_lead', 100, 60, '$'),
('default', 'lead_response_minutes', 5, 2, 'min'),
('default', 'review_velocity_monthly', 8, 15, 'reviews'),
('default', 'no_show_rate', 15, 8, '%'),
('default', 'conversion_rate', 15, 25, '%'),
('default', 'avg_rating', 4.5, 4.8, 'stars');
