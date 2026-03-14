
-- Create prospects table
CREATE TABLE public.prospects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  business_name text NOT NULL,
  website text,
  primary_location text,
  business_type text,
  reason_for_inquiry text,
  timeline text,
  is_decision_maker text,
  proposal_recipient_email text,
  budget_range text,
  source text DEFAULT 'website',
  stage text NOT NULL DEFAULT 'new_submission',
  status text NOT NULL DEFAULT 'new_lead',
  assigned_to uuid,
  meeting_date timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

-- Admins/operators full access
CREATE POLICY "Admins manage prospects" ON public.prospects
  FOR ALL TO authenticated
  USING (is_admin_or_operator(auth.uid()))
  WITH CHECK (is_admin_or_operator(auth.uid()));

-- Allow anonymous inserts (public booking form)
CREATE POLICY "Public can submit prospects" ON public.prospects
  FOR INSERT TO anon
  WITH CHECK (true);

-- Anon demo access for reading
CREATE POLICY "Anon demo read prospects" ON public.prospects
  FOR SELECT TO anon
  USING (true);

-- Updated_at trigger
CREATE TRIGGER update_prospects_updated_at
  BEFORE UPDATE ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
