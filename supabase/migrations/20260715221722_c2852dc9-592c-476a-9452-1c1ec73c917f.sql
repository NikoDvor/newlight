
DO $$ BEGIN
  CREATE TYPE public.marketing_material_type AS ENUM ('email','social_post','ad','landing_page','video','print','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.marketing_material_status AS ENUM ('draft','submitted','in_review','changes_requested','approved','published','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.marketing_disclosure_type AS ENUM ('testimonial','compensation','conflict_of_interest','general');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.marketing_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  title TEXT NOT NULL,
  material_type public.marketing_material_type NOT NULL DEFAULT 'other',
  content_url TEXT,
  content_text TEXT,
  status public.marketing_material_status NOT NULL DEFAULT 'draft',
  has_testimonial BOOLEAN NOT NULL DEFAULT false,
  current_version_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_materials TO authenticated;
GRANT ALL ON public.marketing_materials TO service_role;
ALTER TABLE public.marketing_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "marketing_materials client access" ON public.marketing_materials FOR ALL TO authenticated
  USING (public.user_can_access_client(auth.uid(), client_id))
  WITH CHECK (public.user_can_access_client(auth.uid(), client_id));
CREATE TRIGGER update_marketing_materials_updated_at BEFORE UPDATE ON public.marketing_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_marketing_materials_client ON public.marketing_materials(client_id);
CREATE INDEX idx_marketing_materials_status ON public.marketing_materials(status);

CREATE TABLE public.marketing_material_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES public.marketing_materials(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  content_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  disclosure_ids UUID[] NOT NULL DEFAULT '{}',
  submitted_by UUID,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  status public.marketing_material_status NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(material_id, version_number)
);
GRANT SELECT, INSERT, UPDATE ON public.marketing_material_versions TO authenticated;
GRANT ALL ON public.marketing_material_versions TO service_role;
ALTER TABLE public.marketing_material_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "marketing_versions view" ON public.marketing_material_versions FOR SELECT TO authenticated
  USING (public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY "marketing_versions insert" ON public.marketing_material_versions FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY "marketing_versions reviewer update" ON public.marketing_material_versions FOR UPDATE TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR private.has_role(auth.uid(), 'marketing_staff'::public.app_role)
  )
  WITH CHECK (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR private.has_role(auth.uid(), 'marketing_staff'::public.app_role)
  );
CREATE INDEX idx_marketing_versions_material ON public.marketing_material_versions(material_id);

CREATE OR REPLACE FUNCTION public.marketing_versions_prevent_snapshot_update()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.content_snapshot IS DISTINCT FROM OLD.content_snapshot
     OR NEW.version_number IS DISTINCT FROM OLD.version_number
     OR NEW.material_id IS DISTINCT FROM OLD.material_id
     OR NEW.submitted_by IS DISTINCT FROM OLD.submitted_by
     OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN
    RAISE EXCEPTION 'marketing_material_versions rows are immutable for content fields';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER marketing_versions_immutable BEFORE UPDATE ON public.marketing_material_versions
  FOR EACH ROW EXECUTE FUNCTION public.marketing_versions_prevent_snapshot_update();

CREATE TABLE public.marketing_disclosures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  disclosure_text TEXT NOT NULL,
  disclosure_type public.marketing_disclosure_type NOT NULL DEFAULT 'general',
  is_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_disclosures TO authenticated;
GRANT ALL ON public.marketing_disclosures TO service_role;
ALTER TABLE public.marketing_disclosures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "marketing_disclosures client access" ON public.marketing_disclosures FOR ALL TO authenticated
  USING (public.user_can_access_client(auth.uid(), client_id))
  WITH CHECK (public.user_can_access_client(auth.uid(), client_id));
CREATE TRIGGER update_marketing_disclosures_updated_at BEFORE UPDATE ON public.marketing_disclosures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.marketing_substantiation_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES public.marketing_materials(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  claim_text TEXT NOT NULL,
  file_url TEXT,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_substantiation_files TO authenticated;
GRANT ALL ON public.marketing_substantiation_files TO service_role;
ALTER TABLE public.marketing_substantiation_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "marketing_substantiation client access" ON public.marketing_substantiation_files FOR ALL TO authenticated
  USING (public.user_can_access_client(auth.uid(), client_id))
  WITH CHECK (public.user_can_access_client(auth.uid(), client_id));
CREATE INDEX idx_marketing_substantiation_material ON public.marketing_substantiation_files(material_id);
