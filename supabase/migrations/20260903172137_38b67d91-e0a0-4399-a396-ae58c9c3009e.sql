CREATE TABLE public.channel_tracking_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  channel text NOT NULL,
  label text NOT NULL,
  twilio_number text NOT NULL UNIQUE,
  forwards_to text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_tracking_numbers TO authenticated;
GRANT ALL ON public.channel_tracking_numbers TO service_role;
ALTER TABLE public.channel_tracking_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage tracking numbers" ON public.channel_tracking_numbers FOR ALL TO authenticated
  USING (private.is_admin_or_operator(auth.uid())) WITH CHECK (private.is_admin_or_operator(auth.uid()));

CREATE TABLE public.attribution_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  channel text NOT NULL,
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  event_type text NOT NULL,
  contact_name text,
  contact_phone text,
  contact_email text,
  value numeric,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_attribution_events_client_occurred ON public.attribution_events (client_id, occurred_at);
CREATE INDEX idx_attribution_events_client_channel ON public.attribution_events (client_id, channel);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attribution_events TO authenticated;
GRANT ALL ON public.attribution_events TO service_role;
ALTER TABLE public.attribution_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage attribution events" ON public.attribution_events FOR ALL TO authenticated
  USING (private.is_admin_or_operator(auth.uid())) WITH CHECK (private.is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users view own attribution events" ON public.attribution_events FOR SELECT TO authenticated
  USING (private.user_has_client_access(auth.uid(), client_id));

CREATE TABLE public.ad_account_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform text NOT NULL,
  external_account_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  secret_ref text,
  connected_by uuid REFERENCES auth.users(id),
  connected_at timestamptz,
  last_synced_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, platform)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_account_connections TO authenticated;
GRANT ALL ON public.ad_account_connections TO service_role;
ALTER TABLE public.ad_account_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ad account connections" ON public.ad_account_connections FOR ALL TO authenticated
  USING (private.is_admin_or_operator(auth.uid())) WITH CHECK (private.is_admin_or_operator(auth.uid()));

CREATE TABLE public.ad_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform text NOT NULL,
  campaign_name text,
  conversions integer NOT NULL DEFAULT 0,
  conversion_value numeric NOT NULL DEFAULT 0,
  spend numeric NOT NULL DEFAULT 0,
  date date NOT NULL,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, platform, campaign_name, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_conversions TO authenticated;
GRANT ALL ON public.ad_conversions TO service_role;
ALTER TABLE public.ad_conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ad conversions" ON public.ad_conversions FOR ALL TO authenticated
  USING (private.is_admin_or_operator(auth.uid())) WITH CHECK (private.is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users view own ad conversions" ON public.ad_conversions FOR SELECT TO authenticated
  USING (private.user_has_client_access(auth.uid(), client_id));