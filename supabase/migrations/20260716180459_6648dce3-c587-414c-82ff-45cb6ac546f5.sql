CREATE TABLE public.growth_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  opportunity_type text,
  title text,
  narrative text,
  sized_revenue_low numeric,
  sized_revenue_expected numeric,
  sized_revenue_high numeric,
  confidence_pct integer,
  effort_level text,
  assumptions text,
  status text NOT NULL DEFAULT 'active',
  generated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.growth_opportunities TO authenticated;
GRANT ALL ON public.growth_opportunities TO service_role;
ALTER TABLE public.growth_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client users view their growth opportunities"
ON public.growth_opportunities FOR SELECT TO authenticated
USING (private.user_has_client_access(auth.uid(), client_id) OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Client users update their growth opportunities"
ON public.growth_opportunities FOR UPDATE TO authenticated
USING (private.user_has_client_access(auth.uid(), client_id) OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert growth opportunities"
ON public.growth_opportunities FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete growth opportunities"
ON public.growth_opportunities FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_growth_opportunities_client_status ON public.growth_opportunities(client_id, status);

CREATE TABLE public.growth_competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  competitor_name text,
  review_count integer,
  avg_rating numeric,
  estimated_share_of_voice integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.growth_competitors TO authenticated;
GRANT ALL ON public.growth_competitors TO service_role;
ALTER TABLE public.growth_competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client users view their competitors"
ON public.growth_competitors FOR SELECT TO authenticated
USING (private.user_has_client_access(auth.uid(), client_id) OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Client users insert their competitors"
ON public.growth_competitors FOR INSERT TO authenticated
WITH CHECK (private.user_has_client_access(auth.uid(), client_id) OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Client users update their competitors"
ON public.growth_competitors FOR UPDATE TO authenticated
USING (private.user_has_client_access(auth.uid(), client_id) OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Client users delete their competitors"
ON public.growth_competitors FOR DELETE TO authenticated
USING (private.user_has_client_access(auth.uid(), client_id) OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_growth_competitors_client ON public.growth_competitors(client_id);