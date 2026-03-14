
-- Add extended branding fields to client_branding
ALTER TABLE public.client_branding
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS dashboard_title text,
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS accent_color text,
  ADD COLUMN IF NOT EXISTS calendar_title text,
  ADD COLUMN IF NOT EXISTS calendar_subtitle text,
  ADD COLUMN IF NOT EXISTS calendar_logo_url text,
  ADD COLUMN IF NOT EXISTS calendar_primary_color text,
  ADD COLUMN IF NOT EXISTS calendar_confirmation_message text,
  ADD COLUMN IF NOT EXISTS finance_dashboard_title text,
  ADD COLUMN IF NOT EXISTS report_header_title text,
  ADD COLUMN IF NOT EXISTS report_subtitle text,
  ADD COLUMN IF NOT EXISTS report_logo_url text,
  ADD COLUMN IF NOT EXISTS tax_module_title text,
  ADD COLUMN IF NOT EXISTS tax_dashboard_subtitle text,
  ADD COLUMN IF NOT EXISTS tax_report_header_title text,
  ADD COLUMN IF NOT EXISTS tax_reminder_header_text text,
  ADD COLUMN IF NOT EXISTS tax_document_vault_title text,
  ADD COLUMN IF NOT EXISTS filing_readiness_title text,
  ADD COLUMN IF NOT EXISTS payroll_header_title text,
  ADD COLUMN IF NOT EXISTS workspace_header_name text,
  ADD COLUMN IF NOT EXISTS login_branding_text text,
  ADD COLUMN IF NOT EXISTS updated_by uuid;

-- Create tax_documents table for document vault
CREATE TABLE IF NOT EXISTS public.tax_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  document_type text NOT NULL DEFAULT 'other',
  file_url text,
  uploaded_by uuid,
  status text NOT NULL DEFAULT 'uploaded',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tax_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage tax_documents" ON public.tax_documents FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users view own tax_documents" ON public.tax_documents FOR SELECT TO authenticated USING (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Client users insert own tax_documents" ON public.tax_documents FOR INSERT TO authenticated WITH CHECK (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo access on tax_documents" ON public.tax_documents FOR ALL TO anon USING (true) WITH CHECK (true);

-- Create tax_deadlines table
CREATE TABLE IF NOT EXISTS public.tax_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  deadline_date date NOT NULL,
  deadline_type text NOT NULL DEFAULT 'quarterly',
  status text NOT NULL DEFAULT 'upcoming',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tax_deadlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage tax_deadlines" ON public.tax_deadlines FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users view own tax_deadlines" ON public.tax_deadlines FOR SELECT TO authenticated USING (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo access on tax_deadlines" ON public.tax_deadlines FOR ALL TO anon USING (true) WITH CHECK (true);

-- Create filing_readiness table
CREATE TABLE IF NOT EXISTS public.filing_readiness (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'missing',
  assigned_to uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.filing_readiness ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage filing_readiness" ON public.filing_readiness FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users view own filing_readiness" ON public.filing_readiness FOR SELECT TO authenticated USING (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo access on filing_readiness" ON public.filing_readiness FOR ALL TO anon USING (true) WITH CHECK (true);

-- Create storage bucket for tax documents
INSERT INTO storage.buckets (id, name, public) VALUES ('tax-documents', 'tax-documents', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Auth users upload tax docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'tax-documents');
CREATE POLICY "Auth users view tax docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'tax-documents');
