ALTER TABLE public.nl_bdr_leads
  ADD COLUMN provisioned_client_id uuid REFERENCES public.clients(id);

CREATE INDEX idx_nl_bdr_leads_provisioned_client_id ON public.nl_bdr_leads (provisioned_client_id);