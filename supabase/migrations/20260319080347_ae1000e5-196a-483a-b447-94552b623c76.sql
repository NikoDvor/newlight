
-- Recommended Services
CREATE TABLE IF NOT EXISTS public.recommended_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  service_key text NOT NULL,
  service_name text NOT NULL,
  recommendation_status text NOT NULL DEFAULT 'Active',
  priority_rank integer NOT NULL DEFAULT 0,
  urgency_level text NOT NULL DEFAULT 'Medium',
  fit_score numeric DEFAULT 0,
  projected_monthly_revenue_impact numeric DEFAULT 0,
  projected_annual_revenue_impact numeric DEFAULT 0,
  confidence_score numeric DEFAULT 0,
  reason_summary text,
  recommended_package_id uuid REFERENCES public.offer_packages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recommended_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/operator full access on recommended_services"
  ON public.recommended_services FOR ALL
  USING (public.is_admin_or_operator(auth.uid()));

CREATE POLICY "Client users view own recommended_services"
  ON public.recommended_services FOR SELECT
  USING (public.user_has_client_access(auth.uid(), client_id));

CREATE TRIGGER set_recommended_services_updated_at
  BEFORE UPDATE ON public.recommended_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Revenue Projection Models
CREATE TABLE IF NOT EXISTS public.revenue_projection_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  model_type text NOT NULL,
  baseline_payload_json jsonb DEFAULT '{}'::jsonb,
  market_assumptions_json jsonb DEFAULT '{}'::jsonb,
  projected_payload_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.revenue_projection_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/operator full access on revenue_projection_models"
  ON public.revenue_projection_models FOR ALL
  USING (public.is_admin_or_operator(auth.uid()));

CREATE POLICY "Client users view own revenue_projection_models"
  ON public.revenue_projection_models FOR SELECT
  USING (public.user_has_client_access(auth.uid(), client_id));

CREATE TRIGGER set_revenue_projection_models_updated_at
  BEFORE UPDATE ON public.revenue_projection_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Service Recommendation Signals
CREATE TABLE IF NOT EXISTS public.service_recommendation_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  signal_type text NOT NULL,
  signal_key text NOT NULL,
  signal_value numeric DEFAULT 0,
  signal_weight numeric DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_recommendation_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/operator full access on service_recommendation_signals"
  ON public.service_recommendation_signals FOR ALL
  USING (public.is_admin_or_operator(auth.uid()));

CREATE POLICY "Client users view own signals"
  ON public.service_recommendation_signals FOR SELECT
  USING (public.user_has_client_access(auth.uid(), client_id));

CREATE TRIGGER set_service_recommendation_signals_updated_at
  BEFORE UPDATE ON public.service_recommendation_signals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
