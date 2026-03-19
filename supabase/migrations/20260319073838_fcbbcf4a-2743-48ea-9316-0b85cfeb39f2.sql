
-- ═══ OFFER PACKAGES ═══
CREATE TABLE IF NOT EXISTS public.offer_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_name text NOT NULL,
  package_key text NOT NULL UNIQUE,
  package_category text NOT NULL DEFAULT 'Core Offer',
  package_status text NOT NULL DEFAULT 'Draft',
  description text,
  service_focus text,
  pricing_model text NOT NULL DEFAULT 'Setup Plus Monthly',
  default_setup_fee numeric DEFAULT 0,
  default_monthly_fee numeric DEFAULT 0,
  default_ad_spend_commitment numeric,
  default_contract_length_months integer DEFAULT 6,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.offer_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/operator full access on offer_packages" ON public.offer_packages FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid()));
CREATE TRIGGER set_offer_packages_updated_at BEFORE UPDATE ON public.offer_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══ PACKAGE DELIVERABLES ═══
CREATE TABLE IF NOT EXISTS public.package_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.offer_packages(id) ON DELETE CASCADE,
  deliverable_name text NOT NULL,
  deliverable_category text NOT NULL DEFAULT 'Custom',
  description text,
  is_included_by_default boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.package_deliverables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/operator full access on package_deliverables" ON public.package_deliverables FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid()));
CREATE TRIGGER set_package_deliverables_updated_at BEFORE UPDATE ON public.package_deliverables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══ PACKAGE FEATURE FLAGS ═══
CREATE TABLE IF NOT EXISTS public.package_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.offer_packages(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  feature_name text NOT NULL,
  feature_enabled boolean NOT NULL DEFAULT true,
  config_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.package_feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/operator full access on package_feature_flags" ON public.package_feature_flags FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid()));
CREATE TRIGGER set_package_feature_flags_updated_at BEFORE UPDATE ON public.package_feature_flags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══ PACKAGE PROPOSAL LINKS ═══
CREATE TABLE IF NOT EXISTS public.package_proposal_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.offer_packages(id) ON DELETE CASCADE,
  proposal_template_id uuid NOT NULL REFERENCES public.proposal_templates(id) ON DELETE CASCADE,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.package_proposal_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/operator full access on package_proposal_links" ON public.package_proposal_links FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid()));

-- ═══ PACKAGE BILLING DEFAULTS ═══
CREATE TABLE IF NOT EXISTS public.package_billing_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.offer_packages(id) ON DELETE CASCADE,
  billing_frequency text NOT NULL DEFAULT 'Monthly',
  setup_fee_default numeric DEFAULT 0,
  monthly_fee_default numeric DEFAULT 0,
  ad_spend_default numeric,
  contract_term_default integer DEFAULT 6,
  auto_renew_default boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.package_billing_defaults ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/operator full access on package_billing_defaults" ON public.package_billing_defaults FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid()));

-- ═══ PACKAGE ACTIVATION DEFAULTS ═══
CREATE TABLE IF NOT EXISTS public.package_activation_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.offer_packages(id) ON DELETE CASCADE,
  default_template_id uuid,
  default_snapshot_id uuid,
  activation_defaults_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.package_activation_defaults ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/operator full access on package_activation_defaults" ON public.package_activation_defaults FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid()));

-- ═══ PACKAGE RELATIONSHIPS ═══
CREATE TABLE IF NOT EXISTS public.package_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_package_id uuid NOT NULL REFERENCES public.offer_packages(id) ON DELETE CASCADE,
  related_package_id uuid NOT NULL REFERENCES public.offer_packages(id) ON DELETE CASCADE,
  relationship_type text NOT NULL DEFAULT 'Upsell',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.package_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/operator full access on package_relationships" ON public.package_relationships FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid()));

-- ═══ READ-ONLY FOR CLIENT USERS (offer_packages + deliverables) ═══
CREATE POLICY "Authenticated users can read active packages" ON public.offer_packages FOR SELECT TO authenticated USING (is_active = true AND package_status = 'Active');
CREATE POLICY "Authenticated users can read deliverables of active packages" ON public.package_deliverables FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.offer_packages op WHERE op.id = package_id AND op.is_active = true AND op.package_status = 'Active'));
