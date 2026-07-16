CREATE TABLE public.client_signal_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  industry text,
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_signal_snapshots TO authenticated;
GRANT ALL ON public.client_signal_snapshots TO service_role;

ALTER TABLE public.client_signal_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their client's signal snapshot"
  ON public.client_signal_snapshots FOR SELECT
  TO authenticated
  USING (public.user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Service role manages signal snapshots"
  ON public.client_signal_snapshots FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_client_signal_snapshots_updated_at
  BEFORE UPDATE ON public.client_signal_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();