-- Add missing columns to service_catalog
ALTER TABLE public.service_catalog ADD COLUMN IF NOT EXISTS internal_service_key text;
ALTER TABLE public.service_catalog ADD COLUMN IF NOT EXISTS service_category text;
ALTER TABLE public.service_catalog ADD COLUMN IF NOT EXISTS linked_form_id uuid;
ALTER TABLE public.service_catalog ADD COLUMN IF NOT EXISTS linked_page_id uuid;

-- Add missing columns to product_catalog
ALTER TABLE public.product_catalog ADD COLUMN IF NOT EXISTS internal_product_key text;
ALTER TABLE public.product_catalog ADD COLUMN IF NOT EXISTS product_category text;
ALTER TABLE public.product_catalog ADD COLUMN IF NOT EXISTS linked_page_id uuid;

-- Add missing columns to offer_catalog
ALTER TABLE public.offer_catalog ADD COLUMN IF NOT EXISTS offer_slug text;
ALTER TABLE public.offer_catalog ADD COLUMN IF NOT EXISTS linked_page_id uuid;

-- Create faq_records table
CREATE TABLE IF NOT EXISTS public.faq_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.faq_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "faq_records_client_access" ON public.faq_records
  FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

-- Create website_content_blocks table
CREATE TABLE IF NOT EXISTS public.website_content_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  page_key text NOT NULL DEFAULT 'homepage',
  block_key text NOT NULL,
  block_type text NOT NULL DEFAULT 'RichText',
  block_label text,
  content_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.website_content_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wcb_client_access" ON public.website_content_blocks
  FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

-- Triggers for updated_at
CREATE OR REPLACE TRIGGER faq_records_updated_at
  BEFORE UPDATE ON public.faq_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER wcb_updated_at
  BEFORE UPDATE ON public.website_content_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();