CREATE TABLE public.client_oauth_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  integration_type text NOT NULL,
  access_token text,
  refresh_token text,
  token_expiry timestamptz,
  property_url text,
  location_id text,
  status text NOT NULL DEFAULT 'active',
  connected_at timestamptz NOT NULL DEFAULT now(),
  connected_by uuid REFERENCES auth.users(id),
  UNIQUE (client_id, integration_type)
);

GRANT SELECT ON public.client_oauth_connections TO authenticated;
GRANT ALL ON public.client_oauth_connections TO service_role;

ALTER TABLE public.client_oauth_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all rows"
  ON public.client_oauth_connections
  FOR SELECT
  TO authenticated
  USING (true);