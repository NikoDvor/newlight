
-- Add missing columns to recommended_services
ALTER TABLE public.recommended_services 
  ADD COLUMN IF NOT EXISTS projected_lead_impact numeric,
  ADD COLUMN IF NOT EXISTS projected_booking_impact numeric,
  ADD COLUMN IF NOT EXISTS projected_conversion_impact numeric;

-- Create recommendation_runs table
CREATE TABLE IF NOT EXISTS public.recommendation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  run_status text NOT NULL DEFAULT 'Queued',
  top_service_key text,
  top_projected_monthly_revenue_impact numeric,
  run_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recommendation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own client recommendation runs"
  ON public.recommendation_runs FOR SELECT TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can insert own client recommendation runs"
  ON public.recommendation_runs FOR INSERT TO authenticated
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can update own client recommendation runs"
  ON public.recommendation_runs FOR UPDATE TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id));

-- Add update trigger
CREATE TRIGGER update_recommendation_runs_updated_at
  BEFORE UPDATE ON public.recommendation_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
