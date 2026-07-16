
ALTER TABLE public.crm_deals
  ADD COLUMN IF NOT EXISTS initial_fee numeric,
  ADD COLUMN IF NOT EXISTS pricing_model text CHECK (pricing_model IN ('retainer','commission')),
  ADD COLUMN IF NOT EXISTS recurring_fee numeric,
  ADD COLUMN IF NOT EXISTS commission_rate numeric,
  ADD COLUMN IF NOT EXISTS closing_notes text,
  ADD COLUMN IF NOT EXISTS close_prep_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS close_prep_meeting_id uuid REFERENCES public.bdr_calendar_events(id) ON DELETE SET NULL;

CREATE TABLE public.close_prep_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.nl_bdr_leads(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.crm_deals(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.close_prep_links TO authenticated;
GRANT ALL ON public.close_prep_links TO service_role;

ALTER TABLE public.close_prep_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own close prep links"
  ON public.close_prep_links FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can insert their own close prep links"
  ON public.close_prep_links FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can update their own close prep links"
  ON public.close_prep_links FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete close prep links"
  ON public.close_prep_links FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE INDEX idx_close_prep_links_user_id ON public.close_prep_links(user_id);
CREATE INDEX idx_close_prep_links_lead_id ON public.close_prep_links(lead_id);
CREATE INDEX idx_close_prep_links_deal_id ON public.close_prep_links(deal_id);
