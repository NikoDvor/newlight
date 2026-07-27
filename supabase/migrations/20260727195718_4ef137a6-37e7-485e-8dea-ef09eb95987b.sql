CREATE POLICY "ss_photos_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'street-sweep-photos');
CREATE POLICY "ss_photos_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'street-sweep-photos');
CREATE POLICY "ss_photos_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'street-sweep-photos');
CREATE POLICY "ss_photos_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'street-sweep-photos');