ALTER TABLE public.document_envelopes ADD COLUMN IF NOT EXISTS provisioned_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS provisioned_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_document_envelopes_provisioned_client ON public.document_envelopes(provisioned_client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_provisioned_client ON public.invoices(provisioned_client_id);

ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS billing_cadence text NOT NULL DEFAULT 'monthly';
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS annual_started_at timestamptz;
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS app_store_complimentary boolean NOT NULL DEFAULT false;

CREATE POLICY "Envelopes: provisioned client read"
ON public.document_envelopes FOR SELECT TO authenticated
USING (provisioned_client_id IS NOT NULL AND user_can_access_client(auth.uid(), provisioned_client_id));

CREATE POLICY "client_invoices_read_provisioned"
ON public.invoices FOR SELECT TO authenticated
USING (provisioned_client_id IS NOT NULL AND private.user_has_client_access(auth.uid(), provisioned_client_id));

CREATE POLICY "Client users read own provisioned crm_deals"
ON public.crm_deals FOR SELECT TO authenticated
USING (provisioned_client_id IS NOT NULL AND private.user_has_client_access(auth.uid(), provisioned_client_id));