
DROP TABLE IF EXISTS public.offers CASCADE;
DROP TABLE IF EXISTS public.invoice_drafts CASCADE;
DROP TABLE IF EXISTS public.calculations CASCADE;
DROP TABLE IF EXISTS public.field_reports CASCADE;
DROP TABLE IF EXISTS public.communications CASCADE;
DROP TABLE IF EXISTS public.materials CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.photos CASCADE;
DROP TABLE IF EXISTS public.measurements CASCADE;
DROP TYPE IF EXISTS public.offer_status CASCADE;
DROP TYPE IF EXISTS public.report_status CASCADE;

ALTER TABLE public.projects RENAME TO sites;
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT '#F26A21',
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;

CREATE TABLE public.permissions (
  key TEXT PRIMARY KEY,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT NOT NULL
);
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permissions readable" ON public.permissions FOR SELECT TO authenticated USING (true);

INSERT INTO public.permissions(key, resource, action, description) VALUES
  ('sites:read','sites','read','Baustellen anzeigen'),
  ('sites:create','sites','create','Baustellen erstellen'),
  ('sites:update','sites','update','Baustellen bearbeiten'),
  ('sites:delete','sites','delete','Baustellen archivieren'),
  ('sites:chat','sites','chat','In Baustellen-Chat schreiben'),
  ('time:own','time','own','Eigene Zeiten erfassen'),
  ('time:read_team','time','read_team','Zeiten des Teams sehen'),
  ('time:approve','time','approve','Zeitkorrekturen genehmigen'),
  ('plan:read_own','plan','read_own','Eigene Wochenplanung sehen'),
  ('plan:read_all','plan','read_all','Alle Wochenplanungen sehen'),
  ('plan:write','plan','write','Wochenplanung erstellen/aendern'),
  ('absences:own','absences','own','Eigene Abwesenheiten beantragen'),
  ('absences:approve','absences','approve','Abwesenheiten genehmigen'),
  ('absences:read_all','absences','read_all','Alle Abwesenheiten sehen'),
  ('employees:read','employees','read','Mitarbeiter anzeigen'),
  ('employees:create','employees','create','Mitarbeiter anlegen'),
  ('employees:update','employees','update','Mitarbeiter bearbeiten'),
  ('employees:deactivate','employees','deactivate','Mitarbeiter deaktivieren'),
  ('roles:manage','roles','manage','Rollen und Berechtigungen verwalten'),
  ('settings:manage','settings','manage','Betriebseinstellungen verwalten'),
  ('sso:manage','sso','manage','SSO / SAML konfigurieren');

CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_key)
);
GRANT SELECT, INSERT, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_role_assignments (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_role_assignments TO authenticated;
GRANT ALL ON public.user_role_assignments TO service_role;
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    JOIN public.role_permissions rp ON rp.role_id = ura.role_id
    WHERE ura.user_id = _user_id AND rp.permission_key = _permission
  );
$$;

CREATE POLICY "roles: tenant read" ON public.roles FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));
CREATE POLICY "roles: admin manage" ON public.roles FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id) AND public.has_permission(auth.uid(),'roles:manage'))
  WITH CHECK (public.is_tenant_member(tenant_id) AND public.has_permission(auth.uid(),'roles:manage'));

CREATE POLICY "role_perms: tenant read" ON public.role_permissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_id AND public.is_tenant_member(r.tenant_id)));
CREATE POLICY "role_perms: admin manage" ON public.role_permissions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_id AND public.is_tenant_member(r.tenant_id) AND public.has_permission(auth.uid(),'roles:manage')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_id AND public.is_tenant_member(r.tenant_id) AND public.has_permission(auth.uid(),'roles:manage')));

CREATE POLICY "ura: tenant read" ON public.user_role_assignments FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));
CREATE POLICY "ura: admin manage" ON public.user_role_assignments FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id) AND public.has_permission(auth.uid(),'roles:manage'))
  WITH CHECK (public.is_tenant_member(tenant_id) AND public.has_permission(auth.uid(),'roles:manage'));

CREATE OR REPLACE FUNCTION public.seed_default_roles(_tenant_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  role_defs JSONB := '[
    {"key":"unternehmensinhaber","name":"Unternehmensinhaber","perms":["*"]},
    {"key":"administrator","name":"Administrator","perms":["*"]},
    {"key":"personalverwaltung","name":"Personalverwaltung","perms":["employees:read","employees:create","employees:update","employees:deactivate","absences:read_all","absences:approve","plan:read_all"]},
    {"key":"buchhaltung","name":"Buchhaltung","perms":["employees:read","absences:read_all","time:read_team"]},
    {"key":"bauleiter","name":"Bauleiter","perms":["sites:read","sites:create","sites:update","sites:chat","time:own","time:read_team","time:approve","plan:read_all","plan:write","absences:own","absences:approve","employees:read"]},
    {"key":"vorarbeiter","name":"Vorarbeiter","perms":["sites:read","sites:chat","time:own","time:read_team","plan:read_own","absences:own","employees:read"]},
    {"key":"mitarbeiter","name":"Mitarbeiter","perms":["sites:read","sites:chat","time:own","plan:read_own","absences:own"]}
  ]'::jsonb;
  role_row JSONB;
  new_role_id UUID;
  perm_key TEXT;
BEGIN
  FOR role_row IN SELECT * FROM jsonb_array_elements(role_defs) LOOP
    INSERT INTO public.roles(tenant_id, key, name, is_system)
    VALUES (_tenant_id, role_row->>'key', role_row->>'name', true)
    ON CONFLICT (tenant_id, key) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO new_role_id;

    DELETE FROM public.role_permissions WHERE role_id = new_role_id;

    IF (role_row->'perms'->>0) = '*' THEN
      INSERT INTO public.role_permissions(role_id, permission_key)
      SELECT new_role_id, key FROM public.permissions;
    ELSE
      FOR perm_key IN SELECT jsonb_array_elements_text(role_row->'perms') LOOP
        INSERT INTO public.role_permissions(role_id, permission_key)
        VALUES (new_role_id, perm_key)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_tenant_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.seed_default_roles(NEW.id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_seed_default_roles ON public.tenants;
CREATE TRIGGER trg_seed_default_roles AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.on_tenant_created();

DO $$ DECLARE t RECORD; BEGIN
  FOR t IN SELECT id FROM public.tenants LOOP
    PERFORM public.seed_default_roles(t.id);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_tenant_id UUID;
  betrieb TEXT;
  owner_role_id UUID;
BEGIN
  betrieb := COALESCE(NEW.raw_user_meta_data->>'betrieb', 'Mein Betrieb');
  INSERT INTO public.tenants(name) VALUES (betrieb) RETURNING id INTO new_tenant_id;
  INSERT INTO public.profiles(id, tenant_id, full_name)
    VALUES (NEW.id, new_tenant_id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  SELECT id INTO owner_role_id FROM public.roles WHERE tenant_id = new_tenant_id AND key = 'unternehmensinhaber';
  IF owner_role_id IS NOT NULL THEN
    INSERT INTO public.user_role_assignments(user_id, role_id, tenant_id)
      VALUES (NEW.id, owner_role_id, new_tenant_id);
  END IF;
  RETURN NEW;
END;
$$;

INSERT INTO public.user_role_assignments(user_id, role_id, tenant_id)
SELECT p.id, r.id, p.tenant_id
FROM public.profiles p
JOIN public.roles r ON r.tenant_id = p.tenant_id AND r.key = 'unternehmensinhaber'
ON CONFLICT DO NOTHING;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS employee_number TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS entry_date DATE,
  ADD COLUMN IF NOT EXISTS exit_date DATE,
  ADD COLUMN IF NOT EXISTS weekly_hours NUMERIC,
  ADD COLUMN IF NOT EXISTS work_time_model TEXT,
  ADD COLUMN IF NOT EXISTS vacation_days_per_year INT DEFAULT 24,
  ADD COLUMN IF NOT EXISTS cost_center TEXT,
  ADD COLUMN IF NOT EXISTS subgroup TEXT,
  ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS state_code TEXT DEFAULT 'BW';

ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS activity_type TEXT NOT NULL DEFAULT 'baustelle',
  ADD COLUMN IF NOT EXISTS pause_seconds INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS photos TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS voice_note_url TEXT,
  ADD COLUMN IF NOT EXISTS report_text TEXT,
  ADD COLUMN IF NOT EXISTS ai_report TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

CREATE TABLE public.absences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_calculated NUMERIC,
  note TEXT,
  attachment_url TEXT,
  status TEXT NOT NULL DEFAULT 'eingereicht',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_comment TEXT,
  substitute_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.absences TO authenticated;
GRANT ALL ON public.absences TO service_role;
ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "absences: own read" ON public.absences FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "absences: approver read" ON public.absences FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id) AND public.has_permission(auth.uid(),'absences:read_all'));
CREATE POLICY "absences: own insert" ON public.absences FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_tenant_member(tenant_id) AND public.has_permission(auth.uid(),'absences:own'));
CREATE POLICY "absences: own update" ON public.absences FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status IN ('entwurf','eingereicht'))
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "absences: approver update" ON public.absences FOR UPDATE TO authenticated
  USING (public.is_tenant_member(tenant_id) AND public.has_permission(auth.uid(),'absences:approve'))
  WITH CHECK (public.is_tenant_member(tenant_id) AND public.has_permission(auth.uid(),'absences:approve'));
CREATE POLICY "absences: own delete draft" ON public.absences FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND status = 'entwurf');
CREATE TRIGGER update_absences_updated_at BEFORE UPDATE ON public.absences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.weekly_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  activity_type TEXT,
  start_time TIME,
  end_time TIME,
  note TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX weekly_assignments_user_day_idx ON public.weekly_assignments(user_id, day);
CREATE INDEX weekly_assignments_tenant_day_idx ON public.weekly_assignments(tenant_id, day);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_assignments TO authenticated;
GRANT ALL ON public.weekly_assignments TO service_role;
ALTER TABLE public.weekly_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan: own read" ON public.weekly_assignments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "plan: all read" ON public.weekly_assignments FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id) AND public.has_permission(auth.uid(),'plan:read_all'));
CREATE POLICY "plan: write" ON public.weekly_assignments FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id) AND public.has_permission(auth.uid(),'plan:write'))
  WITH CHECK (public.is_tenant_member(tenant_id) AND public.has_permission(auth.uid(),'plan:write'));

CREATE TABLE public.qualifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qualifications TO authenticated;
GRANT ALL ON public.qualifications TO service_role;
ALTER TABLE public.qualifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quals: tenant read" ON public.qualifications FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "quals: hr manage" ON public.qualifications FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id) AND public.has_permission(auth.uid(),'employees:update'))
  WITH CHECK (public.is_tenant_member(tenant_id) AND public.has_permission(auth.uid(),'employees:update'));

CREATE TABLE public.employee_qualifications (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  qualification_id UUID NOT NULL REFERENCES public.qualifications(id) ON DELETE CASCADE,
  acquired_on DATE,
  expires_on DATE,
  document_url TEXT,
  PRIMARY KEY (user_id, qualification_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_qualifications TO authenticated;
GRANT ALL ON public.employee_qualifications TO service_role;
ALTER TABLE public.employee_qualifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "empq: self read" ON public.employee_qualifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "empq: hr read" ON public.employee_qualifications FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'employees:read'));
CREATE POLICY "empq: hr manage" ON public.employee_qualifications FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'employees:update'))
  WITH CHECK (public.has_permission(auth.uid(),'employees:update'));

CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  identifier TEXT,
  handed_out_on DATE,
  returned_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment TO authenticated;
GRANT ALL ON public.equipment TO service_role;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equip: self read" ON public.equipment FOR SELECT TO authenticated USING (assigned_to = auth.uid());
CREATE POLICY "equip: hr read" ON public.equipment FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id) AND public.has_permission(auth.uid(),'employees:read'));
CREATE POLICY "equip: hr manage" ON public.equipment FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id) AND public.has_permission(auth.uid(),'employees:update'))
  WITH CHECK (public.is_tenant_member(tenant_id) AND public.has_permission(auth.uid(),'employees:update'));

CREATE TABLE public.site_members (
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_on_site TEXT DEFAULT 'monteur',
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (site_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.site_members TO authenticated;
GRANT ALL ON public.site_members TO service_role;
ALTER TABLE public.site_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sm: tenant read" ON public.site_members FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_id AND public.is_tenant_member(s.tenant_id)));
CREATE POLICY "sm: managers manage" ON public.site_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_id AND public.is_tenant_member(s.tenant_id) AND public.has_permission(auth.uid(),'sites:update')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_id AND public.is_tenant_member(s.tenant_id) AND public.has_permission(auth.uid(),'sites:update')));

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif: self read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif: self update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_tenant_idx ON public.audit_log(tenant_id, created_at DESC);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit: admin read" ON public.audit_log FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id) AND public.has_permission(auth.uid(),'roles:manage'));

CREATE TABLE public.tenant_sso_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  domain TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.tenant_sso_domains TO authenticated;
GRANT ALL ON public.tenant_sso_domains TO service_role;
ALTER TABLE public.tenant_sso_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sso: tenant read" ON public.tenant_sso_domains FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "sso: admin manage" ON public.tenant_sso_domains FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id) AND public.has_permission(auth.uid(),'sso:manage'))
  WITH CHECK (public.is_tenant_member(tenant_id) AND public.has_permission(auth.uid(),'sso:manage'));
