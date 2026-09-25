CREATE TABLE public.nl_sourced_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  user_id uuid NOT NULL,
  business_name text NOT NULL,
  city text,
  crd text,
  source text,
  focus_label text,
  status text NOT NULL DEFAULT 'sourced' CHECK (status IN ('sourced','queued','researched','imported','skipped')),
  queued_at timestamptz,
  researched_at timestamptz,
  imported_at timestamptz,
  imported_lead_id uuid REFERENCES public.nl_bdr_leads(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nl_sourced_leads_client_crd_key UNIQUE (client_id, crd)
);
CREATE INDEX idx_nl_sourced_leads_client_user ON public.nl_sourced_leads(client_id, user_id);
CREATE INDEX idx_nl_sourced_leads_status_created ON public.nl_sourced_leads(client_id, status, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nl_sourced_leads TO authenticated;
GRANT ALL ON public.nl_sourced_leads TO service_role;
ALTER TABLE public.nl_sourced_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_select_sourced ON public.nl_sourced_leads FOR SELECT TO authenticated USING (public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY tenant_insert_sourced ON public.nl_sourced_leads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY tenant_update_sourced ON public.nl_sourced_leads FOR UPDATE TO authenticated USING (public.user_can_access_client(auth.uid(), client_id)) WITH CHECK (public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY tenant_delete_sourced ON public.nl_sourced_leads FOR DELETE TO authenticated USING (public.user_can_access_client(auth.uid(), client_id) AND (auth.uid() = user_id OR private.is_admin_or_operator(auth.uid())));