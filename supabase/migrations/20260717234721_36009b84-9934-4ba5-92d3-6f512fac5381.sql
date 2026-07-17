
DROP POLICY IF EXISTS "Envelopes: client access" ON public.document_envelopes;
DROP POLICY IF EXISTS "Envelopes: authenticated update" ON public.document_envelopes;
DROP POLICY IF EXISTS "Envelopes: authenticated insert" ON public.document_envelopes;
DROP POLICY IF EXISTS "Envelope items: via envelope" ON public.document_envelope_items;
DROP POLICY IF EXISTS "Envelope sigs: via envelope" ON public.document_envelope_signatures;

CREATE POLICY "Envelopes: client access"
ON public.document_envelopes FOR SELECT TO authenticated
USING (
  (client_id IS NULL AND private.is_admin_or_operator(auth.uid()))
  OR (client_id IS NOT NULL AND public.user_can_access_client(auth.uid(), client_id))
);

CREATE POLICY "Envelopes: authenticated update"
ON public.document_envelopes FOR UPDATE TO authenticated
USING (
  (client_id IS NULL AND private.is_admin_or_operator(auth.uid()))
  OR (client_id IS NOT NULL AND public.user_can_access_client(auth.uid(), client_id))
)
WITH CHECK (
  (client_id IS NULL AND private.is_admin_or_operator(auth.uid()))
  OR (client_id IS NOT NULL AND public.user_can_access_client(auth.uid(), client_id))
);

CREATE POLICY "Envelopes: authenticated insert"
ON public.document_envelopes FOR INSERT TO authenticated
WITH CHECK (
  (client_id IS NULL AND private.is_admin_or_operator(auth.uid()))
  OR (client_id IS NOT NULL AND public.user_can_access_client(auth.uid(), client_id))
);

CREATE POLICY "Envelope items: via envelope"
ON public.document_envelope_items FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.document_envelopes e
  WHERE e.id = document_envelope_items.envelope_id
    AND ((e.client_id IS NULL AND private.is_admin_or_operator(auth.uid()))
         OR (e.client_id IS NOT NULL AND public.user_can_access_client(auth.uid(), e.client_id)))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.document_envelopes e
  WHERE e.id = document_envelope_items.envelope_id
    AND ((e.client_id IS NULL AND private.is_admin_or_operator(auth.uid()))
         OR (e.client_id IS NOT NULL AND public.user_can_access_client(auth.uid(), e.client_id)))
));

CREATE POLICY "Envelope sigs: via envelope"
ON public.document_envelope_signatures FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.document_envelopes e
  WHERE e.id = document_envelope_signatures.envelope_id
    AND ((e.client_id IS NULL AND private.is_admin_or_operator(auth.uid()))
         OR (e.client_id IS NOT NULL AND public.user_can_access_client(auth.uid(), e.client_id)))
));
