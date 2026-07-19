CREATE TABLE public.project_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_messages TO authenticated;
GRANT ALL ON public.project_messages TO service_role;
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat: tenant members read"
  ON public.project_messages FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

CREATE POLICY "chat: tenant members insert"
  ON public.project_messages FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_member(tenant_id) AND user_id = auth.uid());

CREATE POLICY "chat: own delete or admin"
  ON public.project_messages FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR (public.is_tenant_member(tenant_id) AND public.has_role(auth.uid(), 'admin')));

CREATE INDEX project_messages_project_created_idx
  ON public.project_messages(project_id, created_at);

ALTER TABLE public.project_messages REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Team page needs to read colleagues in same tenant
DROP POLICY IF EXISTS "profiles: read own tenant" ON public.profiles;
CREATE POLICY "profiles: read own tenant"
  ON public.profiles FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "user_roles: read own tenant" ON public.user_roles;
CREATE POLICY "user_roles: read own tenant"
  ON public.user_roles FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());