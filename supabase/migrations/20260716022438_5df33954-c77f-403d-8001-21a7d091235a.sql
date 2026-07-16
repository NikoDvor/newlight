
ALTER TABLE public.nl_bdr_leads ADD COLUMN IF NOT EXISTS logo_url text;

CREATE POLICY "Anon public booking logo upload"
ON storage.objects FOR INSERT TO anon
WITH CHECK (
  bucket_id = 'client-logos'
  AND (storage.foldername(name))[1] = 'public-booking'
);
