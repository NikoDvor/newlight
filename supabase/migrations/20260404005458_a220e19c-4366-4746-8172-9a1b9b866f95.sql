
-- =============================================
-- DROP old permissive storage policies
-- =============================================

-- client-logos: drop overly permissive write policies
DROP POLICY IF EXISTS "Authenticated upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete logos" ON storage.objects;

-- website-media: drop overly permissive write policies
DROP POLICY IF EXISTS "Authenticated users can upload website media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete website media" ON storage.objects;

-- =============================================
-- client-logos: tenant-scoped write policies
-- Files must be stored as {client_id}/filename
-- =============================================

CREATE POLICY "Tenant scoped logo upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'client-logos'
  AND public.user_has_client_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Tenant scoped logo update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'client-logos'
  AND public.user_has_client_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Tenant scoped logo delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'client-logos'
  AND public.user_has_client_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

-- =============================================
-- website-media: tenant-scoped write policies
-- =============================================

CREATE POLICY "Tenant scoped media upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'website-media'
  AND public.user_has_client_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Tenant scoped media update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'website-media'
  AND public.user_has_client_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Tenant scoped media delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'website-media'
  AND public.user_has_client_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);
