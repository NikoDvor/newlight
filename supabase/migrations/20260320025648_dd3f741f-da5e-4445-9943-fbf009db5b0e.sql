
-- Implementation Requests
CREATE TABLE IF NOT EXISTS public.implementation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  requested_by_user_id UUID,
  recommendation_id UUID,
  package_id UUID REFERENCES public.offer_packages(id),
  related_contact_id UUID REFERENCES public.crm_contacts(id),
  related_deal_id UUID REFERENCES public.crm_deals(id),
  request_type TEXT NOT NULL DEFAULT 'Recommended Service',
  request_status TEXT NOT NULL DEFAULT 'New',
  urgency_level TEXT NOT NULL DEFAULT 'Medium',
  request_message TEXT,
  internal_notes TEXT,
  assigned_admin_user_id UUID,
  recommendation_name TEXT,
  recommendation_key TEXT,
  package_name TEXT,
  projected_monthly NUMERIC DEFAULT 0,
  projected_annual NUMERIC DEFAULT 0,
  default_setup_fee NUMERIC DEFAULT 0,
  default_monthly_fee NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.implementation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to implementation_requests"
  ON public.implementation_requests FOR ALL
  TO authenticated
  USING (public.is_admin_or_operator(auth.uid()))
  WITH CHECK (public.is_admin_or_operator(auth.uid()));

CREATE POLICY "Client users can view own requests"
  ON public.implementation_requests FOR SELECT
  TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Client users can insert own requests"
  ON public.implementation_requests FOR INSERT
  TO authenticated
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

-- Implementation Request Events
CREATE TABLE IF NOT EXISTS public.implementation_request_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES public.implementation_requests(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_summary TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.implementation_request_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to request_events"
  ON public.implementation_request_events FOR ALL
  TO authenticated
  USING (public.is_admin_or_operator(auth.uid()))
  WITH CHECK (public.is_admin_or_operator(auth.uid()));

CREATE POLICY "Client users can view own request events"
  ON public.implementation_request_events FOR SELECT
  TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Client users can insert own request events"
  ON public.implementation_request_events FOR INSERT
  TO authenticated
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

-- Updated_at trigger
CREATE TRIGGER update_implementation_requests_updated_at
  BEFORE UPDATE ON public.implementation_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
