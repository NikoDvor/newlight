CREATE TABLE public.client_websites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  site_type text NOT NULL DEFAULT 'newlight_build'
    CHECK (site_type IN ('newlight_build', 'external')),
  lovable_project_url text,
  published_url text,
  custom_domain text,
  domain_status text NOT NULL DEFAULT 'none'
    CHECK (domain_status IN ('none','pending','connected','failed')),
  build_status text NOT NULL DEFAULT 'not_started'
    CHECK (build_status IN ('not_started','in_progress','live','needs_update')),
  template_version text DEFAULT 'v1',
  external_url text,
  snippet_installed boolean NOT NULL DEFAULT false,
  snippet_status text NOT NULL DEFAULT 'not_installed'
    CHECK (snippet_status IN ('not_installed','pending','installed','error')),
  last_updated_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_websites TO authenticated;
GRANT ALL ON public.client_websites TO service_role;

ALTER TABLE public.client_websites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_client_websites" ON public.client_websites
  FOR ALL TO authenticated
  USING (private.is_admin_or_operator(auth.uid()))
  WITH CHECK (private.is_admin_or_operator(auth.uid()));

CREATE POLICY "clients_client_websites" ON public.client_websites
  FOR ALL TO authenticated
  USING (private.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (private.user_has_client_access(auth.uid(), client_id));

CREATE TRIGGER client_websites_updated_at
  BEFORE UPDATE ON public.client_websites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();