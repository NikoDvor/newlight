
CREATE TABLE public.client_intake_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.client_intake_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and operators can manage intake tokens"
  ON public.client_intake_tokens
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_operator(auth.uid()));

CREATE INDEX idx_client_intake_tokens_token ON public.client_intake_tokens (token);
CREATE INDEX idx_client_intake_tokens_client ON public.client_intake_tokens (client_id);
