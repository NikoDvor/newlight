
-- Add missing columns to proposals
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS pricing_model text DEFAULT 'monthly_retainer',
  ADD COLUMN IF NOT EXISTS ad_spend_commitment numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS share_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS notes_client text,
  ADD COLUMN IF NOT EXISTS service_package_type text,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Create proposal_line_items
CREATE TABLE IF NOT EXISTS public.proposal_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES public.proposals(id) ON DELETE CASCADE NOT NULL,
  item_name text NOT NULL,
  item_description text,
  item_type text DEFAULT 'service',
  quantity integer DEFAULT 1,
  unit_price numeric DEFAULT 0,
  total_price numeric DEFAULT 0,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.proposal_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/operator can manage line items"
  ON public.proposal_line_items FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()));

-- Create proposal_signatures
CREATE TABLE IF NOT EXISTS public.proposal_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES public.proposals(id) ON DELETE CASCADE NOT NULL,
  signer_name text NOT NULL,
  signer_email text NOT NULL,
  signature_data text,
  ip_address text,
  signed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.proposal_signatures ENABLE ROW LEVEL SECURITY;

-- Signatures can be inserted by anyone (public proposal page) and read by admin
CREATE POLICY "Anyone can insert signatures"
  ON public.proposal_signatures FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admin/operator can read signatures"
  ON public.proposal_signatures FOR SELECT TO authenticated
  USING (public.is_admin_or_operator(auth.uid()));

-- Allow anon/public to read proposals by share_token (for client-facing page)
CREATE POLICY "Public can view proposals by share_token"
  ON public.proposals FOR SELECT TO anon
  USING (share_token IS NOT NULL);

-- Allow anon to update proposals (for accept/reject via share_token)
CREATE POLICY "Public can update proposal status via token"
  ON public.proposals FOR UPDATE TO anon
  USING (share_token IS NOT NULL)
  WITH CHECK (share_token IS NOT NULL);

-- Allow anon to read proposal_sections for public proposals
CREATE POLICY "Public can view proposal sections"
  ON public.proposal_sections FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_id AND p.share_token IS NOT NULL));

-- Allow anon to read proposal_line_items for public proposals
CREATE POLICY "Public can view proposal line items"
  ON public.proposal_line_items FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_id AND p.share_token IS NOT NULL));

-- Generate share_token for existing proposals that don't have one
UPDATE public.proposals SET share_token = encode(gen_random_bytes(24), 'hex') WHERE share_token IS NULL;

-- Seed default proposal templates
INSERT INTO public.proposal_templates (template_name, proposal_type, service_package, default_setup_fee, default_monthly_fee, default_contract_term, is_active, template_config)
VALUES
  ('Generate Leads & Appointments', 'service_proposal', 'lead_generation', 997, 1997, '6 months', true,
   '{"deliverables":["Google Ads Management","Landing Page Optimization","CRM Pipeline Setup","Lead Tracking Dashboard","Bi-weekly Performance Reports"],"guarantee":"Minimum 15 qualified leads in first 60 days or we extend free","timeline":"Launch in 7 business days"}'::jsonb),
  ('Drive Online Sales', 'service_proposal', 'ecommerce_growth', 1497, 2497, '6 months', true,
   '{"deliverables":["eCommerce SEO Audit & Fix","Google Shopping Ads","Social Media Ads (Meta)","Conversion Rate Optimization","Monthly Revenue Reports"],"guarantee":"ROAS improvement within 90 days","timeline":"Full launch in 14 business days"}'::jsonb),
  ('Increase Local Visibility', 'service_proposal', 'local_visibility', 497, 1497, '6 months', true,
   '{"deliverables":["Google Business Profile Optimization","Local SEO (Citations + On-Page)","Review Generation System","Social Media Posting (2 platforms)","Monthly Visibility Report"],"guarantee":"Top 3 local pack within 6 months for primary keyword","timeline":"Setup in 5 business days"}'::jsonb),
  ('Custom Package', 'service_proposal', 'custom', 0, 0, '6 months', true,
   '{"deliverables":["Tailored to your business needs"],"guarantee":"","timeline":"Discussed during consultation"}'::jsonb)
ON CONFLICT DO NOTHING;
