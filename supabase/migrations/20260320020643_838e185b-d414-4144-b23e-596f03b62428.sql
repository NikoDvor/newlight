
CREATE TABLE IF NOT EXISTS public.recommendation_package_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_service_key text NOT NULL,
  package_id uuid REFERENCES public.offer_packages(id) ON DELETE CASCADE NOT NULL,
  priority_order integer NOT NULL DEFAULT 1,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(recommendation_service_key, package_id)
);

ALTER TABLE public.recommendation_package_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on recommendation_package_links"
  ON public.recommendation_package_links FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()));

CREATE POLICY "Authenticated users can read recommendation_package_links"
  ON public.recommendation_package_links FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER update_recommendation_package_links_updated_at
  BEFORE UPDATE ON public.recommendation_package_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
