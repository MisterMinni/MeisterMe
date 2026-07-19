
-- Storage policies for avatars bucket (path prefix = user id)
CREATE POLICY "avatars: users read own or same tenant"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND p.tenant_id = public.current_tenant_id()
    )
  )
);

CREATE POLICY "avatars: users upload own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "avatars: users update own"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars: users delete own"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Employee documents
CREATE TABLE public.employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT,
  storage_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_documents TO authenticated;
GRANT ALL ON public.employee_documents TO service_role;

ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employee_documents: user reads own"
ON public.employee_documents FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_permission(auth.uid(), 'employees:read')
);

CREATE POLICY "employee_documents: admin manages"
ON public.employee_documents FOR ALL
TO authenticated
USING (
  tenant_id = public.current_tenant_id()
  AND public.has_permission(auth.uid(), 'employees:update')
)
WITH CHECK (
  tenant_id = public.current_tenant_id()
  AND public.has_permission(auth.uid(), 'employees:update')
);

-- Storage policies for handwerk-files: employee documents live under employee-docs/{user_id}/
CREATE POLICY "handwerk-files: employee-docs read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'handwerk-files'
  AND (storage.foldername(name))[1] = 'employee-docs'
  AND (
    (storage.foldername(name))[2] = auth.uid()::text
    OR public.has_permission(auth.uid(), 'employees:read')
  )
);

CREATE POLICY "handwerk-files: employee-docs write admin"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'handwerk-files'
  AND (storage.foldername(name))[1] = 'employee-docs'
  AND public.has_permission(auth.uid(), 'employees:update')
);

CREATE POLICY "handwerk-files: employee-docs delete admin"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'handwerk-files'
  AND (storage.foldername(name))[1] = 'employee-docs'
  AND public.has_permission(auth.uid(), 'employees:update')
);
