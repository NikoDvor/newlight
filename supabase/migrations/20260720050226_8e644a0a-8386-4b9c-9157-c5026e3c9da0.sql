DROP POLICY IF EXISTS "Anon public booking logo upload" ON storage.objects;
CREATE POLICY "Public booking logo upload"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'client-logos'
    AND (storage.foldername(name))[1] = 'public-booking'
  );