
-- Workspace Templates
CREATE TABLE IF NOT EXISTS public.workspace_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  template_key text NOT NULL UNIQUE,
  industry_type text NOT NULL DEFAULT 'Custom',
  service_package_type text NOT NULL DEFAULT 'Custom',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Template Components
CREATE TABLE IF NOT EXISTS public.template_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.workspace_templates(id) ON DELETE CASCADE NOT NULL,
  component_type text NOT NULL,
  component_key text NOT NULL,
  component_config jsonb DEFAULT '{}'::jsonb,
  component_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Template Deployments
CREATE TABLE IF NOT EXISTS public.template_deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.workspace_templates(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  deployed_by uuid,
  deployment_status text NOT NULL DEFAULT 'Pending',
  deployed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Snapshot Records
CREATE TABLE IF NOT EXISTS public.snapshot_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_name text NOT NULL,
  snapshot_key text NOT NULL UNIQUE,
  source_workspace_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  source_template_id uuid REFERENCES public.workspace_templates(id) ON DELETE SET NULL,
  snapshot_type text NOT NULL DEFAULT 'Full System Snapshot',
  snapshot_scope text NOT NULL DEFAULT 'Internal Only',
  snapshot_payload jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.workspace_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshot_records ENABLE ROW LEVEL SECURITY;

-- Admin/operator only policies
CREATE POLICY "admin_operator_workspace_templates" ON public.workspace_templates
  FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()))
  WITH CHECK (public.is_admin_or_operator(auth.uid()));

CREATE POLICY "admin_operator_template_components" ON public.template_components
  FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()))
  WITH CHECK (public.is_admin_or_operator(auth.uid()));

CREATE POLICY "admin_operator_template_deployments" ON public.template_deployments
  FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()))
  WITH CHECK (public.is_admin_or_operator(auth.uid()));

CREATE POLICY "admin_operator_snapshot_records" ON public.snapshot_records
  FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()))
  WITH CHECK (public.is_admin_or_operator(auth.uid()));

-- updated_at triggers
CREATE TRIGGER set_updated_at_workspace_templates BEFORE UPDATE ON public.workspace_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_template_components BEFORE UPDATE ON public.template_components FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_template_deployments BEFORE UPDATE ON public.template_deployments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_snapshot_records BEFORE UPDATE ON public.snapshot_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
