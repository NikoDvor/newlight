CREATE TABLE IF NOT EXISTS public.street_sweep_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  created_by uuid NOT NULL,
  assigned_to uuid,
  route_name text NOT NULL,
  street_name text NOT NULL,
  city text NOT NULL,
  state text NOT NULL DEFAULT 'CA',
  block_range text,
  status text NOT NULL DEFAULT 'in_progress',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.street_sweep_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.street_sweep_routes(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  visited_by uuid NOT NULL,
  business_name text NOT NULL,
  address text NOT NULL,
  unit_suite text,
  lat numeric,
  lng numeric,
  storefront_status text NOT NULL DEFAULT 'open',
  has_signage boolean DEFAULT true,
  has_booking_qr boolean DEFAULT false,
  niche_guess text,
  photo_url text,
  notes text,
  research_status text NOT NULL DEFAULT 'pending',
  owner_name text,
  owner_phone text,
  website text,
  booking_link_type text,
  lead_id uuid REFERENCES public.nl_bdr_leads(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.street_sweep_routes TO authenticated;
GRANT ALL ON public.street_sweep_routes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.street_sweep_visits TO authenticated;
GRANT ALL ON public.street_sweep_visits TO service_role;

CREATE INDEX IF NOT EXISTS idx_ssv_route ON public.street_sweep_visits(route_id);
CREATE INDEX IF NOT EXISTS idx_ssr_client ON public.street_sweep_routes(client_id);

ALTER TABLE public.street_sweep_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.street_sweep_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ssr_client_access" ON public.street_sweep_routes
  FOR ALL TO authenticated
  USING (public.user_can_access_client(auth.uid(), client_id))
  WITH CHECK (public.user_can_access_client(auth.uid(), client_id));

CREATE POLICY "ssv_client_access" ON public.street_sweep_visits
  FOR ALL TO authenticated
  USING (public.user_can_access_client(auth.uid(), client_id))
  WITH CHECK (public.user_can_access_client(auth.uid(), client_id));

CREATE OR REPLACE TRIGGER ssr_updated_at BEFORE UPDATE ON public.street_sweep_routes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER ssv_updated_at BEFORE UPDATE ON public.street_sweep_visits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();