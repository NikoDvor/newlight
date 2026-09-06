CREATE TABLE public.client_legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  document_type text NOT NULL DEFAULT 'other',
  document_name text NOT NULL,
  file_url text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_legal_documents TO authenticated;
GRANT ALL ON public.client_legal_documents TO service_role;

ALTER TABLE public.client_legal_documents ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_client_legal_documents_client ON public.client_legal_documents(client_id, created_at DESC);

CREATE POLICY "Staff manage all legal documents"
  ON public.client_legal_documents FOR ALL TO authenticated
  USING (private.is_admin_or_operator(auth.uid()))
  WITH CHECK (private.is_admin_or_operator(auth.uid()));

CREATE POLICY "Client members read own legal documents"
  ON public.client_legal_documents FOR SELECT TO authenticated
  USING (private.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Client members insert own legal documents"
  ON public.client_legal_documents FOR INSERT TO authenticated
  WITH CHECK (private.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Staff view legal document files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'client-legal-documents' AND private.is_admin_or_operator(auth.uid()));

CREATE POLICY "Workspace users view legal document files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'client-legal-documents' AND private.user_has_client_access(auth.uid(), ((storage.foldername(name))[1])::uuid));

CREATE POLICY "Workspace users upload legal document files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-legal-documents' AND private.user_has_client_access(auth.uid(), ((storage.foldername(name))[1])::uuid));

CREATE POLICY "Staff manage legal document files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'client-legal-documents' AND private.is_admin_or_operator(auth.uid()));