
CREATE TYPE public.envelope_type AS ENUM ('proposal', 'onboarding_bundle', 'other');
CREATE TYPE public.envelope_status AS ENUM ('draft', 'sent', 'viewed', 'signed', 'declined', 'expired');

CREATE TABLE public.document_envelopes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID,
  envelope_type public.envelope_type NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status public.envelope_status NOT NULL DEFAULT 'draft',
  related_type TEXT,
  related_id UUID,
  recipient_name TEXT,
  recipient_email TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_envelopes TO authenticated;
GRANT ALL ON public.document_envelopes TO service_role;
GRANT SELECT ON public.document_envelopes TO anon;

ALTER TABLE public.document_envelopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Envelopes: client access"
  ON public.document_envelopes FOR SELECT TO authenticated
  USING (client_id IS NULL OR public.user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Envelopes: authenticated insert"
  ON public.document_envelopes FOR INSERT TO authenticated
  WITH CHECK (client_id IS NULL OR public.user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Envelopes: authenticated update"
  ON public.document_envelopes FOR UPDATE TO authenticated
  USING (client_id IS NULL OR public.user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Envelopes: public view by token"
  ON public.document_envelopes FOR SELECT TO anon
  USING (true);

CREATE TRIGGER update_document_envelopes_updated_at
  BEFORE UPDATE ON public.document_envelopes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.document_envelope_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  envelope_id UUID NOT NULL REFERENCES public.document_envelopes(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_url TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_envelope_items TO authenticated;
GRANT ALL ON public.document_envelope_items TO service_role;
GRANT SELECT ON public.document_envelope_items TO anon;

ALTER TABLE public.document_envelope_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Envelope items: via envelope"
  ON public.document_envelope_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.document_envelopes e WHERE e.id = envelope_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.document_envelopes e WHERE e.id = envelope_id));

CREATE POLICY "Envelope items: public read"
  ON public.document_envelope_items FOR SELECT TO anon
  USING (true);

CREATE TABLE public.document_envelope_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  envelope_id UUID NOT NULL REFERENCES public.document_envelopes(id) ON DELETE CASCADE,
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signature_data TEXT,
  ip_address TEXT,
  user_agent TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.document_envelope_signatures TO authenticated;
GRANT ALL ON public.document_envelope_signatures TO service_role;

ALTER TABLE public.document_envelope_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Envelope sigs: via envelope"
  ON public.document_envelope_signatures FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.document_envelopes e WHERE e.id = envelope_id
    AND (e.client_id IS NULL OR public.user_can_access_client(auth.uid(), e.client_id))));

CREATE INDEX idx_document_envelopes_share_token ON public.document_envelopes(share_token);
CREATE INDEX idx_document_envelopes_related ON public.document_envelopes(related_type, related_id);
CREATE INDEX idx_document_envelope_items_env ON public.document_envelope_items(envelope_id);
CREATE INDEX idx_document_envelope_sigs_env ON public.document_envelope_signatures(envelope_id);
