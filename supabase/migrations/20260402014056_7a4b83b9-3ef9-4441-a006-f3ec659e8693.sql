
-- Agreements table
CREATE TABLE public.client_agreements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.crm_deals(id) ON DELETE SET NULL,
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
  agreement_title TEXT NOT NULL DEFAULT 'Service Agreement',
  agreement_status TEXT NOT NULL DEFAULT 'draft',
  agreement_type TEXT NOT NULL DEFAULT 'service_agreement',
  agreement_url TEXT,
  signed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  signer_name TEXT,
  signer_email TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/operator full access on agreements"
  ON public.client_agreements FOR ALL
  USING (public.is_admin_or_operator(auth.uid()));

CREATE POLICY "Client team can view own agreements"
  ON public.client_agreements FOR SELECT
  USING (public.user_has_client_access(auth.uid(), client_id));

CREATE TRIGGER update_client_agreements_updated_at
  BEFORE UPDATE ON public.client_agreements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lifecycle send logs
CREATE TABLE public.lifecycle_send_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL,
  artifact_id UUID,
  action TEXT NOT NULL,
  method TEXT DEFAULT 'manual',
  recipient_email TEXT,
  notes TEXT,
  sent_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lifecycle_send_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/operator full access on send logs"
  ON public.lifecycle_send_logs FOR ALL
  USING (public.is_admin_or_operator(auth.uid()));

CREATE POLICY "Client team can view own send logs"
  ON public.lifecycle_send_logs FOR SELECT
  USING (public.user_has_client_access(auth.uid(), client_id));

-- Extend invoices with send/payment tracking
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payment_link_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_notes TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
