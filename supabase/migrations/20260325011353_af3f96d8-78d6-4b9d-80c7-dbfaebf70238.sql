
-- Add external website bridge columns to website_sites
ALTER TABLE public.website_sites
  ADD COLUMN IF NOT EXISTS website_mode text NOT NULL DEFAULT 'hosted',
  ADD COLUMN IF NOT EXISTS external_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS external_domain text DEFAULT '',
  ADD COLUMN IF NOT EXISTS external_platform text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS external_notes text DEFAULT '';

-- Add page source and publish target to website_pages
ALTER TABLE public.website_pages
  ADD COLUMN IF NOT EXISTS page_source text NOT NULL DEFAULT 'hosted',
  ADD COLUMN IF NOT EXISTS external_page_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS publish_target text NOT NULL DEFAULT 'hosted';

-- Add export status to content blocks
ALTER TABLE public.website_content_blocks
  ADD COLUMN IF NOT EXISTS export_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS last_exported_at timestamptz;
