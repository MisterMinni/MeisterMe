
CREATE POLICY "handwerk_files_read_own_tenant" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'handwerk-files' AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "handwerk_files_insert_own_tenant" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'handwerk-files' AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "handwerk_files_update_own_tenant" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'handwerk-files' AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "handwerk_files_delete_own_tenant" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'handwerk-files' AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid()));
