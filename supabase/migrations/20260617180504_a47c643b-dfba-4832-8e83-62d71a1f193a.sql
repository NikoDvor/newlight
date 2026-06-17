ALTER TABLE public.client_websites
  ADD COLUMN IF NOT EXISTS website_brief text,
  ADD COLUMN IF NOT EXISTS website_build_url text;