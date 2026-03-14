
-- Ad campaigns table for Paid Ads module
CREATE TABLE IF NOT EXISTS public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  campaign_name text NOT NULL,
  platform text NOT NULL DEFAULT 'google_ads',
  status text NOT NULL DEFAULT 'active',
  budget numeric DEFAULT 0,
  spend numeric DEFAULT 0,
  leads integer DEFAULT 0,
  clicks integer DEFAULT 0,
  impressions integer DEFAULT 0,
  conversions integer DEFAULT 0,
  cpl numeric DEFAULT 0,
  roas numeric DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ad_campaigns" ON public.ad_campaigns FOR ALL TO authenticated
  USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));

CREATE POLICY "Client users manage own ad_campaigns" ON public.ad_campaigns FOR ALL TO authenticated
  USING (user_has_client_access(auth.uid(), client_id)) WITH CHECK (user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Anon demo ad_campaigns" ON public.ad_campaigns FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- Add contact_id to review_requests for CRM linkage
ALTER TABLE public.review_requests ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.crm_contacts(id);
ALTER TABLE public.review_requests ADD COLUMN IF NOT EXISTS calendar_event_id uuid REFERENCES public.calendar_events(id);
