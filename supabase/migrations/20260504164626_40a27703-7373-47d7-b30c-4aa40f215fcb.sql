
-- Add objection column to nl_bdr_leads
ALTER TABLE public.nl_bdr_leads ADD COLUMN objection_category TEXT;

-- Create nl_bdr_objections table
CREATE TABLE public.nl_bdr_objections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lead_id UUID REFERENCES public.nl_bdr_leads(id) ON DELETE CASCADE NOT NULL,
  objection_category TEXT NOT NULL,
  outcome_logged TEXT,
  business_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nl_bdr_objections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own objections" ON public.nl_bdr_objections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own objections" ON public.nl_bdr_objections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own objections" ON public.nl_bdr_objections FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_nl_bdr_objections_user_id ON public.nl_bdr_objections(user_id);
CREATE INDEX idx_nl_bdr_objections_category ON public.nl_bdr_objections(objection_category);
