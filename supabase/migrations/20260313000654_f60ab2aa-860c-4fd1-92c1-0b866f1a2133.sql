
ALTER TABLE public.client_branding
  ADD COLUMN IF NOT EXISTS app_icon_url text,
  ADD COLUMN IF NOT EXISTS splash_logo_url text,
  ADD COLUMN IF NOT EXISTS app_display_name text;
