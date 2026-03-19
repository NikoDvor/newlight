
-- Report Snapshots
CREATE TABLE IF NOT EXISTS public.report_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  report_scope_type text NOT NULL DEFAULT 'client_workspace',
  report_type text NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  snapshot_payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.report_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/operator can manage report_snapshots"
  ON public.report_snapshots FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()) OR public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_operator(auth.uid()) OR public.user_has_client_access(auth.uid(), client_id));

-- Opportunity Records
CREATE TABLE IF NOT EXISTS public.opportunity_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  related_type text,
  related_id uuid,
  opportunity_type text NOT NULL,
  title text NOT NULL,
  description text,
  estimated_value numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.opportunity_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/operator or client access for opportunity_records"
  ON public.opportunity_records FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()) OR public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_operator(auth.uid()) OR public.user_has_client_access(auth.uid(), client_id));

-- Revenue Simulations
CREATE TABLE IF NOT EXISTS public.revenue_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  simulation_name text NOT NULL DEFAULT 'Untitled',
  base_payload jsonb DEFAULT '{}'::jsonb,
  assumptions_payload jsonb DEFAULT '{}'::jsonb,
  projected_revenue_amount numeric DEFAULT 0,
  projected_impact_summary text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.revenue_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/operator or client access for revenue_simulations"
  ON public.revenue_simulations FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()) OR public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_operator(auth.uid()) OR public.user_has_client_access(auth.uid(), client_id));

-- KPI Definitions
CREATE TABLE IF NOT EXISTS public.kpi_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  kpi_key text NOT NULL,
  kpi_name text NOT NULL,
  scope_type text NOT NULL DEFAULT 'client_workspace',
  is_active boolean NOT NULL DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kpi_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/operator can manage kpi_definitions"
  ON public.kpi_definitions FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()) OR (client_id IS NOT NULL AND public.user_has_client_access(auth.uid(), client_id)))
  WITH CHECK (public.is_admin_or_operator(auth.uid()) OR (client_id IS NOT NULL AND public.user_has_client_access(auth.uid(), client_id)));
