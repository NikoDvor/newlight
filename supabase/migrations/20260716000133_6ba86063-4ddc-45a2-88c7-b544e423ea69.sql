
CREATE TABLE public.ai_citation_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_citation_queries_client ON public.ai_citation_queries(client_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_citation_queries TO authenticated;
GRANT ALL ON public.ai_citation_queries TO service_role;
ALTER TABLE public.ai_citation_queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Client users manage their citation queries" ON public.ai_citation_queries
  FOR ALL TO authenticated
  USING (private.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (private.user_has_client_access(auth.uid(), client_id));

CREATE TABLE public.ai_citation_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  query_id UUID REFERENCES public.ai_citation_queries(id) ON DELETE SET NULL,
  query_text TEXT NOT NULL,
  ai_model TEXT NOT NULL,
  cited BOOLEAN NOT NULL DEFAULT false,
  response_snippet TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_citation_checks_client_time ON public.ai_citation_checks(client_id, checked_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_citation_checks TO authenticated;
GRANT ALL ON public.ai_citation_checks TO service_role;
ALTER TABLE public.ai_citation_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Client users view their citation checks" ON public.ai_citation_checks
  FOR SELECT TO authenticated
  USING (private.user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Client users manage their citation checks" ON public.ai_citation_checks
  FOR ALL TO authenticated
  USING (private.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (private.user_has_client_access(auth.uid(), client_id));
