
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin','buero','bauleiter','monteur','azubi');
CREATE TYPE public.gewerk AS ENUM ('stuckateur','maler','trockenbauer','dachdecker','schreiner','shk','elektriker','galabau','ausbau','sonstige');
CREATE TYPE public.project_status AS ENUM ('anfrage','angebot','beauftragt','geplant','in_arbeit','abgeschlossen','abgerechnet');
CREATE TYPE public.offer_status AS ENUM ('entwurf','gesendet','angenommen','abgelehnt');
CREATE TYPE public.report_status AS ENUM ('entwurf','fertig','geprueft');
CREATE TYPE public.task_status AS ENUM ('offen','in_arbeit','erledigt');
CREATE TYPE public.invoice_status AS ENUM ('entwurf','freigegeben','gestellt');

-- ============ TENANTS ============
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  gewerk_default public.gewerk DEFAULT 'ausbau',
  adresse TEXT,
  plz TEXT,
  ort TEXT,
  telefon TEXT,
  email TEXT,
  ustid TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, tenant_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ Security definer functions ============
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_member(_tenant_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND tenant_id = _tenant_id)
$$;

-- Signup trigger: create profile + tenant + admin role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_tenant_id UUID;
  betrieb TEXT;
BEGIN
  betrieb := COALESCE(NEW.raw_user_meta_data->>'betrieb', 'Mein Betrieb');
  INSERT INTO public.tenants(name) VALUES (betrieb) RETURNING id INTO new_tenant_id;
  INSERT INTO public.profiles(id, tenant_id, full_name)
    VALUES (NEW.id, new_tenant_id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.user_roles(user_id, tenant_id, role) VALUES (NEW.id, new_tenant_id, 'admin');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ============ RLS for tenants/profiles/user_roles ============
CREATE POLICY "tenants_select_member" ON public.tenants FOR SELECT TO authenticated
  USING (public.is_tenant_member(id));
CREATE POLICY "tenants_update_admin" ON public.tenants FOR UPDATE TO authenticated
  USING (public.is_tenant_member(id) AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "profiles_select_self_or_tenant" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR tenant_id = public.current_tenant_id());
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "user_roles_select_tenant" ON public.user_roles FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

-- ============ CUSTOMERS ============
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  firma TEXT,
  ansprechpartner TEXT,
  adresse TEXT,
  plz TEXT,
  ort TEXT,
  telefon TEXT,
  email TEXT,
  notizen TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_tenant_all" ON public.customers FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PROJECTS ============
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  adresse TEXT,
  gewerk public.gewerk DEFAULT 'ausbau',
  status public.project_status DEFAULT 'anfrage',
  beschreibung TEXT,
  budget NUMERIC(12,2),
  start_datum DATE,
  end_datum DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_tenant_all" ON public.projects FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ MEASUREMENTS ============
CREATE TABLE public.measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  bereich TEXT NOT NULL,
  laenge NUMERIC(10,2) DEFAULT 0,
  breite NUMERIC(10,2) DEFAULT 0,
  hoehe NUMERIC(10,2) DEFAULT 0,
  abzuege JSONB DEFAULT '[]'::jsonb,
  wandflaeche NUMERIC(10,2),
  deckenflaeche NUMERIC(10,2),
  bodenflaeche NUMERIC(10,2),
  umfang NUMERIC(10,2),
  notizen TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.measurements TO authenticated;
GRANT ALL ON public.measurements TO service_role;
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "measurements_tenant_all" ON public.measurements FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

-- ============ MATERIALS ============
CREATE TABLE public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  artikelnummer TEXT,
  bezeichnung TEXT NOT NULL,
  einheit TEXT DEFAULT 'Stk',
  ek_preis NUMERIC(10,2) DEFAULT 0,
  vk_preis NUMERIC(10,2) DEFAULT 0,
  lieferant TEXT,
  lagerbestand NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO authenticated;
GRANT ALL ON public.materials TO service_role;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "materials_tenant_all" ON public.materials FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

-- ============ OFFERS ============
CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nummer TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  status public.offer_status DEFAULT 'entwurf',
  positionen JSONB DEFAULT '[]'::jsonb,
  netto NUMERIC(12,2) DEFAULT 0,
  mwst_satz NUMERIC(4,2) DEFAULT 19,
  rabatt NUMERIC(5,2) DEFAULT 0,
  brutto NUMERIC(12,2) DEFAULT 0,
  gueltig_bis DATE,
  notiz TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offers_tenant_all" ON public.offers FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());
CREATE TRIGGER trg_offers_updated BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ TIME ENTRIES ============
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  taetigkeit TEXT,
  start_ts TIMESTAMPTZ,
  end_ts TIMESTAMPTZ,
  pause_min INT DEFAULT 0,
  fahrt_min INT DEFAULT 0,
  minuten INT,
  notiz TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_entries TO authenticated;
GRANT ALL ON public.time_entries TO service_role;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "time_entries_tenant_all" ON public.time_entries FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

-- ============ FIELD REPORTS ============
CREATE TABLE public.field_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  datum DATE DEFAULT CURRENT_DATE,
  start_zeit TIME,
  end_zeit TIME,
  pause_min INT DEFAULT 0,
  fahrt_min INT DEFAULT 0,
  taetigkeit TEXT,
  probleme TEXT,
  offene_punkte TEXT,
  material JSONB DEFAULT '[]'::jsonb,
  sprachnotiz TEXT,
  ki_bericht TEXT,
  kunden_zusammenfassung TEXT,
  unterschrift_url TEXT,
  status public.report_status DEFAULT 'entwurf',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.field_reports TO authenticated;
GRANT ALL ON public.field_reports TO service_role;
ALTER TABLE public.field_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "field_reports_tenant_all" ON public.field_reports FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());
CREATE TRIGGER trg_reports_updated BEFORE UPDATE ON public.field_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PHOTOS ============
CREATE TABLE public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  report_id UUID REFERENCES public.field_reports(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  tag TEXT,
  notiz TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photos TO authenticated;
GRANT ALL ON public.photos TO service_role;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photos_tenant_all" ON public.photos FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

-- ============ TASKS ============
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  faellig_am DATE,
  status public.task_status DEFAULT 'offen',
  prioritaet TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_tenant_all" ON public.tasks FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

-- ============ INVOICE DRAFTS ============
CREATE TABLE public.invoice_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  positionen JSONB DEFAULT '[]'::jsonb,
  netto NUMERIC(12,2) DEFAULT 0,
  mwst_satz NUMERIC(4,2) DEFAULT 19,
  brutto NUMERIC(12,2) DEFAULT 0,
  status public.invoice_status DEFAULT 'entwurf',
  notiz TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_drafts TO authenticated;
GRANT ALL ON public.invoice_drafts TO service_role;
ALTER TABLE public.invoice_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoice_drafts_tenant_all" ON public.invoice_drafts FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());
CREATE TRIGGER trg_invoice_updated BEFORE UPDATE ON public.invoice_drafts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ COMMUNICATIONS ============
CREATE TABLE public.communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  kanal TEXT DEFAULT 'email',
  richtung TEXT DEFAULT 'ausgehend',
  betreff TEXT,
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.communications TO authenticated;
GRANT ALL ON public.communications TO service_role;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "communications_tenant_all" ON public.communications FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

-- ============ DOCUMENTS ============
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  kind TEXT,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_tenant_all" ON public.documents FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

-- ============ CALCULATIONS ============
CREATE TABLE public.calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  material_kosten NUMERIC(12,2) DEFAULT 0,
  lohn_kosten NUMERIC(12,2) DEFAULT 0,
  stundensatz NUMERIC(8,2) DEFAULT 55,
  gk_zuschlag NUMERIC(5,2) DEFAULT 15,
  gewinn_zuschlag NUMERIC(5,2) DEFAULT 10,
  vk_preis NUMERIC(12,2) DEFAULT 0,
  deckungsbeitrag NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calculations TO authenticated;
GRANT ALL ON public.calculations TO service_role;
ALTER TABLE public.calculations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calculations_tenant_all" ON public.calculations FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

-- Helpful indexes
CREATE INDEX idx_projects_tenant ON public.projects(tenant_id);
CREATE INDEX idx_customers_tenant ON public.customers(tenant_id);
CREATE INDEX idx_offers_tenant ON public.offers(tenant_id);
CREATE INDEX idx_reports_tenant ON public.field_reports(tenant_id);
CREATE INDEX idx_time_entries_tenant_user ON public.time_entries(tenant_id, user_id);
