-- Fix document_envelopes anon SELECT: remove USING(true), block anon reads.
-- Public token-based envelope viewing continues to work via the
-- document-envelope-action edge function (service role, validates share_token).
DROP POLICY IF EXISTS "Envelopes: public view by token" ON public.document_envelopes;
REVOKE SELECT ON public.document_envelopes FROM anon;

-- Fix document_envelope_items anon SELECT: same treatment.
DROP POLICY IF EXISTS "Envelope items: public read" ON public.document_envelope_items;
REVOKE SELECT ON public.document_envelope_items FROM anon;

-- Fix document_envelope_items cross-tenant authenticated policy: require the
-- caller to have access to the parent envelope's client_id, not just that the
-- envelope exists.
DROP POLICY IF EXISTS "Envelope items: via envelope" ON public.document_envelope_items;

CREATE POLICY "Envelope items: via envelope"
  ON public.document_envelope_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.document_envelopes e
    WHERE e.id = envelope_id
      AND (e.client_id IS NULL OR public.user_can_access_client(auth.uid(), e.client_id))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.document_envelopes e
    WHERE e.id = envelope_id
      AND (e.client_id IS NULL OR public.user_can_access_client(auth.uid(), e.client_id))
  ));