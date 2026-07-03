
CREATE TABLE public.client_call_outcomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  outcome TEXT NOT NULL,
  notes TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_call_outcomes TO authenticated;
GRANT ALL ON public.client_call_outcomes TO service_role;

ALTER TABLE public.client_call_outcomes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_client_call_outcomes_client ON public.client_call_outcomes(client_id, logged_at DESC);
CREATE INDEX idx_client_call_outcomes_user ON public.client_call_outcomes(user_id, logged_at DESC);

CREATE POLICY "Users view calls in their client workspace"
  ON public.client_call_outcomes FOR SELECT
  TO authenticated
  USING (public.user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users insert calls in their client workspace"
  ON public.client_call_outcomes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.user_can_access_client(auth.uid(), client_id)
  );

CREATE POLICY "Users update own calls in their client workspace"
  ON public.client_call_outcomes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND public.user_can_access_client(auth.uid(), client_id))
  WITH CHECK (auth.uid() = user_id AND public.user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users delete own calls in their client workspace"
  ON public.client_call_outcomes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND public.user_can_access_client(auth.uid(), client_id));
