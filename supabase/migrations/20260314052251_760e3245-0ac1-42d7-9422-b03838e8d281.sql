
-- Add archived status support and branding asset columns
ALTER TABLE public.client_branding 
  ADD COLUMN IF NOT EXISTS favicon_url text,
  ADD COLUMN IF NOT EXISTS dashboard_logo_url text,
  ADD COLUMN IF NOT EXISTS sidebar_logo_url text,
  ADD COLUMN IF NOT EXISTS avatar_logo_url text;

-- Create storage bucket for logo uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-logos', 'client-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to client logos
CREATE POLICY "Public read client logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'client-logos');

-- Allow authenticated users to upload logos
CREATE POLICY "Authenticated upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-logos');

-- Allow authenticated users to update logos
CREATE POLICY "Authenticated update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'client-logos');

-- Allow authenticated users to delete logos
CREATE POLICY "Authenticated delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-logos');

-- Allow anon to upload (for public forms)
CREATE POLICY "Anon upload logos"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'client-logos');
