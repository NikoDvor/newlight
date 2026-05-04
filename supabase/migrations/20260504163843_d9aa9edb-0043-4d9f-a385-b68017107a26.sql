
-- Create nl_bdr_leads table
CREATE TABLE public.nl_bdr_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  business_name TEXT NOT NULL,
  owner_name TEXT,
  phone TEXT,
  website TEXT,
  niche TEXT,
  city TEXT,
  lead_source TEXT NOT NULL DEFAULT 'bdr_field',
  status TEXT NOT NULL DEFAULT 'new_lead',
  notes TEXT,
  crm_contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  crm_deal_id UUID REFERENCES public.crm_deals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nl_bdr_leads ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only access their own leads
CREATE POLICY "Users can view own leads" ON public.nl_bdr_leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own leads" ON public.nl_bdr_leads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own leads" ON public.nl_bdr_leads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own leads" ON public.nl_bdr_leads FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_nl_bdr_leads_updated_at
  BEFORE UPDATE ON public.nl_bdr_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_nl_bdr_leads_user_id ON public.nl_bdr_leads(user_id);
CREATE INDEX idx_nl_bdr_leads_status ON public.nl_bdr_leads(status);
CREATE INDEX idx_nl_bdr_leads_created_at ON public.nl_bdr_leads(created_at DESC);
