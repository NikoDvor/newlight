
DROP POLICY IF EXISTS "Tenant scoped logo upload" ON storage.objects;
DROP POLICY IF EXISTS "Tenant scoped logo update" ON storage.objects;
DROP POLICY IF EXISTS "Tenant scoped logo delete" ON storage.objects;

CREATE POLICY "Tenant scoped logo upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'client-logos'
  AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND private.user_has_client_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Tenant scoped logo update" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'client-logos'
  AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND private.user_has_client_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Tenant scoped logo delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'client-logos'
  AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND private.user_has_client_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);
