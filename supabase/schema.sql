-- =============================================================================
-- MeisterMe — Vollständiges Datenbank-Schema für Supabase
-- =============================================================================
--
-- Dieses Skript baut die komplette Datenbank für die MeisterMe Handwerker-App
-- in einem frischen Supabase-Projekt auf.
--
-- Enthalten:
--   • Enum-Typen (gewerk, project_status, task_status, invoice_status)
--   • Alle Public-Tabellen (Mandanten, Profile, Rollen/Rechte, Baustellen,
--     Chat, Zeiterfassung, Abwesenheiten, Wochenplanung, Ausrüstung,
--     Qualifikationen, Dokumente, Notifications, Audit-Log, SSO-Domänen)
--   • Fremdschlüssel, Indizes, Unique- & Check-Constraints
--   • Row-Level-Security-Policies für alle Tabellen
--   • Security-Definer Funktionen (current_tenant_id, is_tenant_member,
--     has_permission) plus Seed-Funktion für Default-Rollen
--   • Trigger: neuen User → Tenant + Profil + Owner-Rolle
--   • Storage-Buckets (avatars, chat-images, handwerk-files) inkl. Policies
--   • Seed der Permission-Katalogs
--
-- Anwendung:
--   1. Neues Supabase-Projekt anlegen.
--   2. Im SQL-Editor dieses Skript komplett ausführen.
--   3. Im Frontend `VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_KEY`
--      auf das neue Projekt umstellen.
--
-- Hinweis: Das Skript ist idempotent-freundlich (IF NOT EXISTS wo möglich),
-- kann aber bei nachträglichen Änderungen an existierenden Objekten Fehler
-- werfen. Für saubere Erstinstallation auf leerer DB gedacht.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extensions
-- -----------------------------------------------------------------------------
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 2. Enum-Typen
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.gewerk as enum (
    'stuckateur','maler','trockenbauer','dachdecker','schreiner',
    'shk','elektriker','galabau','ausbau','sonstige'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.project_status as enum (
    'anfrage','angebot','beauftragt','geplant','in_arbeit','abgeschlossen','abgerechnet'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.task_status as enum ('offen','in_arbeit','erledigt');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invoice_status as enum ('entwurf','freigegeben','gestellt');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- 3. Tabellen (public)
-- -----------------------------------------------------------------------------

create table public.tenants (
  id uuid not null default gen_random_uuid(),
  name text not null,
  gewerk_default public.gewerk default 'ausbau'::public.gewerk,
  adresse text,
  plz text,
  ort text,
  telefon text,
  email text,
  ustid text,
  logo_url text,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid not null,
  tenant_id uuid,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  avatar_url text,
  employee_number text,
  address text,
  entry_date date,
  exit_date date,
  weekly_hours numeric,
  work_time_model text,
  vacation_days_per_year integer default 24,
  cost_center text,
  subgroup text,
  disabled_at timestamptz,
  state_code text default 'BW'::text
);

create table public.permissions (
  key text not null,
  resource text not null,
  action text not null,
  description text not null
);

create table public.roles (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  key text not null,
  name text not null,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role_id uuid not null,
  permission_key text not null
);

create table public.user_role_assignments (
  user_id uuid not null,
  role_id uuid not null,
  tenant_id uuid not null,
  assigned_at timestamptz not null default now()
);

create table public.sites (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  customer_id uuid,
  name text not null,
  adresse text,
  gewerk public.gewerk default 'ausbau'::public.gewerk,
  status public.project_status default 'anfrage'::public.project_status,
  beschreibung text,
  budget numeric,
  start_datum date,
  end_datum date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  color text not null default '#F26A21'::text,
  image_url text,
  start_date date,
  end_date date,
  archived_at timestamptz
);

create table public.site_members (
  site_id uuid not null,
  user_id uuid not null,
  role_on_site text default 'monteur'::text,
  added_at timestamptz not null default now()
);

create table public.project_messages (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  project_id uuid not null,
  user_id uuid not null,
  body text,
  created_at timestamptz not null default now(),
  image_url text
);

create table public.tasks (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  project_id uuid,
  title text not null,
  assignee_id uuid,
  faellig_am date,
  status public.task_status default 'offen'::public.task_status,
  prioritaet text default 'normal'::text,
  created_at timestamptz not null default now()
);

create table public.time_entries (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  user_id uuid not null,
  project_id uuid,
  taetigkeit text,
  start_ts timestamptz,
  end_ts timestamptz,
  pause_min integer default 0,
  fahrt_min integer default 0,
  minuten integer,
  notiz text,
  created_at timestamptz not null default now(),
  activity_type text not null default 'baustelle'::text,
  pause_seconds integer not null default 0,
  photos text[] not null default '{}'::text[],
  voice_note_url text,
  report_text text,
  ai_report text,
  status text not null default 'active'::text,
  approved_by uuid,
  approved_at timestamptz
);

create table public.absences (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  user_id uuid not null,
  type text not null,
  start_date date not null,
  end_date date not null,
  days_calculated numeric,
  note text,
  attachment_url text,
  status text not null default 'eingereicht'::text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_comment text,
  substitute_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.weekly_assignments (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  user_id uuid not null,
  day date not null,
  site_id uuid,
  activity_type text,
  start_time time,
  end_time time,
  note text,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create table public.equipment (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  assigned_to uuid,
  type text not null,
  name text not null,
  identifier text,
  handed_out_on date,
  returned_on date,
  created_at timestamptz not null default now()
);

create table public.qualifications (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  category text,
  created_at timestamptz not null default now()
);

create table public.employee_qualifications (
  user_id uuid not null,
  qualification_id uuid not null,
  acquired_on date,
  expires_on date,
  document_url text
);

create table public.employee_documents (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  user_id uuid not null,
  name text not null,
  kind text,
  storage_path text not null,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  project_id uuid,
  customer_id uuid,
  name text not null,
  kind text,
  url text not null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  user_id uuid not null,
  kind text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table public.tenant_sso_domains (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  domain text not null,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 4. Primary Keys, Unique- und Check-Constraints
-- -----------------------------------------------------------------------------
alter table public.tenants               add constraint tenants_pkey primary key (id);
alter table public.profiles              add constraint profiles_pkey primary key (id);
alter table public.permissions           add constraint permissions_pkey primary key (key);
alter table public.roles                 add constraint roles_pkey primary key (id);
alter table public.roles                 add constraint roles_tenant_id_key_key unique (tenant_id, key);
alter table public.role_permissions      add constraint role_permissions_pkey primary key (role_id, permission_key);
alter table public.user_role_assignments add constraint user_role_assignments_pkey primary key (user_id, role_id);
alter table public.sites                 add constraint projects_pkey primary key (id);
alter table public.site_members          add constraint site_members_pkey primary key (site_id, user_id);
alter table public.project_messages      add constraint project_messages_pkey primary key (id);
alter table public.project_messages      add constraint project_messages_body_or_image check (body is not null or image_url is not null);
alter table public.tasks                 add constraint tasks_pkey primary key (id);
alter table public.time_entries          add constraint time_entries_pkey primary key (id);
alter table public.absences              add constraint absences_pkey primary key (id);
alter table public.weekly_assignments    add constraint weekly_assignments_pkey primary key (id);
alter table public.equipment             add constraint equipment_pkey primary key (id);
alter table public.qualifications        add constraint qualifications_pkey primary key (id);
alter table public.employee_qualifications add constraint employee_qualifications_pkey primary key (user_id, qualification_id);
alter table public.employee_documents    add constraint employee_documents_pkey primary key (id);
alter table public.documents             add constraint documents_pkey primary key (id);
alter table public.notifications         add constraint notifications_pkey primary key (id);
alter table public.audit_log             add constraint audit_log_pkey primary key (id);
alter table public.tenant_sso_domains    add constraint tenant_sso_domains_pkey primary key (id);
alter table public.tenant_sso_domains    add constraint tenant_sso_domains_domain_key unique (domain);

-- -----------------------------------------------------------------------------
-- 5. Foreign Keys
-- -----------------------------------------------------------------------------
alter table public.profiles              add constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade;
alter table public.profiles              add constraint profiles_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete set null;

alter table public.roles                 add constraint roles_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
alter table public.role_permissions      add constraint role_permissions_role_id_fkey foreign key (role_id) references public.roles(id) on delete cascade;
alter table public.role_permissions      add constraint role_permissions_permission_key_fkey foreign key (permission_key) references public.permissions(key) on delete cascade;
alter table public.user_role_assignments add constraint user_role_assignments_role_id_fkey foreign key (role_id) references public.roles(id) on delete cascade;
alter table public.user_role_assignments add constraint user_role_assignments_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.user_role_assignments add constraint user_role_assignments_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;

alter table public.sites                 add constraint projects_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
alter table public.site_members          add constraint site_members_site_id_fkey foreign key (site_id) references public.sites(id) on delete cascade;
alter table public.site_members          add constraint site_members_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.project_messages      add constraint project_messages_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
alter table public.project_messages      add constraint project_messages_project_id_fkey foreign key (project_id) references public.sites(id) on delete cascade;
alter table public.project_messages      add constraint project_messages_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.tasks                 add constraint tasks_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
alter table public.tasks                 add constraint tasks_project_id_fkey foreign key (project_id) references public.sites(id) on delete cascade;
alter table public.tasks                 add constraint tasks_assignee_id_fkey foreign key (assignee_id) references auth.users(id) on delete set null;

alter table public.time_entries          add constraint time_entries_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
alter table public.time_entries          add constraint time_entries_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.time_entries          add constraint time_entries_project_id_fkey foreign key (project_id) references public.sites(id) on delete set null;
alter table public.time_entries          add constraint time_entries_approved_by_fkey foreign key (approved_by) references auth.users(id);

alter table public.absences              add constraint absences_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
alter table public.absences              add constraint absences_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.absences              add constraint absences_reviewed_by_fkey foreign key (reviewed_by) references auth.users(id);
alter table public.absences              add constraint absences_substitute_user_id_fkey foreign key (substitute_user_id) references auth.users(id);

alter table public.weekly_assignments    add constraint weekly_assignments_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
alter table public.weekly_assignments    add constraint weekly_assignments_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.weekly_assignments    add constraint weekly_assignments_site_id_fkey foreign key (site_id) references public.sites(id) on delete cascade;
alter table public.weekly_assignments    add constraint weekly_assignments_created_by_fkey foreign key (created_by) references auth.users(id);

alter table public.equipment             add constraint equipment_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
alter table public.equipment             add constraint equipment_assigned_to_fkey foreign key (assigned_to) references auth.users(id) on delete set null;

alter table public.qualifications        add constraint qualifications_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
alter table public.employee_qualifications add constraint employee_qualifications_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.employee_qualifications add constraint employee_qualifications_qualification_id_fkey foreign key (qualification_id) references public.qualifications(id) on delete cascade;

alter table public.employee_documents    add constraint employee_documents_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
alter table public.employee_documents    add constraint employee_documents_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.employee_documents    add constraint employee_documents_uploaded_by_fkey foreign key (uploaded_by) references auth.users(id);

alter table public.documents             add constraint documents_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
alter table public.documents             add constraint documents_project_id_fkey foreign key (project_id) references public.sites(id) on delete cascade;

alter table public.notifications         add constraint notifications_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
alter table public.notifications         add constraint notifications_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.audit_log             add constraint audit_log_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
alter table public.audit_log             add constraint audit_log_actor_id_fkey foreign key (actor_id) references auth.users(id) on delete set null;

alter table public.tenant_sso_domains    add constraint tenant_sso_domains_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;

-- -----------------------------------------------------------------------------
-- 6. Indizes
-- -----------------------------------------------------------------------------
create index if not exists audit_log_tenant_idx                on public.audit_log (tenant_id, created_at desc);
create index if not exists notifications_user_idx              on public.notifications (user_id, created_at desc);
create index if not exists project_messages_project_created_idx on public.project_messages (project_id, created_at);
create index if not exists idx_projects_tenant                 on public.sites (tenant_id);
create index if not exists idx_time_entries_tenant_user        on public.time_entries (tenant_id, user_id);
create index if not exists weekly_assignments_tenant_day_idx   on public.weekly_assignments (tenant_id, day);
create index if not exists weekly_assignments_user_day_idx     on public.weekly_assignments (user_id, day);

-- -----------------------------------------------------------------------------
-- 7. Data-API Grants (PostgREST braucht diese explizit)
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on
  public.tenants, public.profiles, public.roles, public.role_permissions,
  public.user_role_assignments, public.sites, public.site_members,
  public.project_messages, public.tasks, public.time_entries, public.absences,
  public.weekly_assignments, public.equipment, public.qualifications,
  public.employee_qualifications, public.employee_documents, public.documents,
  public.notifications, public.audit_log, public.tenant_sso_domains
to authenticated;

grant select on public.permissions to authenticated;

grant all on
  public.tenants, public.profiles, public.permissions, public.roles,
  public.role_permissions, public.user_role_assignments, public.sites,
  public.site_members, public.project_messages, public.tasks,
  public.time_entries, public.absences, public.weekly_assignments,
  public.equipment, public.qualifications, public.employee_qualifications,
  public.employee_documents, public.documents, public.notifications,
  public.audit_log, public.tenant_sso_domains
to service_role;

-- -----------------------------------------------------------------------------
-- 8. Row-Level Security aktivieren
-- -----------------------------------------------------------------------------
alter table public.tenants                enable row level security;
alter table public.profiles               enable row level security;
alter table public.permissions            enable row level security;
alter table public.roles                  enable row level security;
alter table public.role_permissions       enable row level security;
alter table public.user_role_assignments  enable row level security;
alter table public.sites                  enable row level security;
alter table public.site_members           enable row level security;
alter table public.project_messages       enable row level security;
alter table public.tasks                  enable row level security;
alter table public.time_entries           enable row level security;
alter table public.absences               enable row level security;
alter table public.weekly_assignments     enable row level security;
alter table public.equipment              enable row level security;
alter table public.qualifications         enable row level security;
alter table public.employee_qualifications enable row level security;
alter table public.employee_documents     enable row level security;
alter table public.documents              enable row level security;
alter table public.notifications          enable row level security;
alter table public.audit_log              enable row level security;
alter table public.tenant_sso_domains     enable row level security;

-- -----------------------------------------------------------------------------
-- 9. Security-Definer Funktionen
-- -----------------------------------------------------------------------------
create or replace function public.current_tenant_id()
returns uuid language sql stable security definer set search_path = public as $$
  select tenant_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_tenant_member(_tenant_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and tenant_id = _tenant_id)
$$;

create or replace function public.has_permission(_user_id uuid, _permission text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_role_assignments ura
    join public.role_permissions rp on rp.role_id = ura.role_id
    where ura.user_id = _user_id and rp.permission_key = _permission
  );
$$;

create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

grant execute on function public.current_tenant_id() to authenticated;
grant execute on function public.is_tenant_member(uuid) to authenticated;
grant execute on function public.has_permission(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 10. RLS-Policies
-- -----------------------------------------------------------------------------

-- absences
create policy "absences: approver read"        on public.absences for select to authenticated using (is_tenant_member(tenant_id) and has_permission(auth.uid(), 'absences:read_all'));
create policy "absences: approver update"      on public.absences for update to authenticated using (is_tenant_member(tenant_id) and has_permission(auth.uid(), 'absences:approve')) with check (is_tenant_member(tenant_id) and has_permission(auth.uid(), 'absences:approve'));
create policy "absences: own delete draft"     on public.absences for delete to authenticated using (user_id = auth.uid() and status = 'entwurf');
create policy "absences: own insert"           on public.absences for insert to authenticated with check (user_id = auth.uid() and is_tenant_member(tenant_id) and has_permission(auth.uid(), 'absences:own'));
create policy "absences: own read"             on public.absences for select to authenticated using (user_id = auth.uid());
create policy "absences: own update"           on public.absences for update to authenticated using (user_id = auth.uid() and status = any (array['entwurf','eingereicht'])) with check (user_id = auth.uid());

-- audit_log
create policy "audit: admin read"              on public.audit_log for select to authenticated using (is_tenant_member(tenant_id) and has_permission(auth.uid(), 'roles:manage'));

-- documents
create policy documents_tenant_all             on public.documents for all to authenticated using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());

-- employee_documents
create policy "employee_documents: admin manages"    on public.employee_documents for all to authenticated using (tenant_id = current_tenant_id() and has_permission(auth.uid(), 'employees:update')) with check (tenant_id = current_tenant_id() and has_permission(auth.uid(), 'employees:update'));
create policy "employee_documents: user reads own"   on public.employee_documents for select to authenticated using (user_id = auth.uid() or has_permission(auth.uid(), 'employees:read'));

-- employee_qualifications
create policy "empq: hr manage"                on public.employee_qualifications for all to authenticated using (has_permission(auth.uid(), 'employees:update')) with check (has_permission(auth.uid(), 'employees:update'));
create policy "empq: hr read"                  on public.employee_qualifications for select to authenticated using (has_permission(auth.uid(), 'employees:read'));
create policy "empq: self read"                on public.employee_qualifications for select to authenticated using (user_id = auth.uid());

-- equipment
create policy "equip: hr manage"               on public.equipment for all to authenticated using (is_tenant_member(tenant_id) and has_permission(auth.uid(), 'employees:update')) with check (is_tenant_member(tenant_id) and has_permission(auth.uid(), 'employees:update'));
create policy "equip: hr read"                 on public.equipment for select to authenticated using (is_tenant_member(tenant_id) and has_permission(auth.uid(), 'employees:read'));
create policy "equip: self read"               on public.equipment for select to authenticated using (assigned_to = auth.uid());

-- notifications
create policy "notif: self read"               on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notif: self update"             on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- permissions (Katalog, jeder Angemeldete darf lesen)
create policy "permissions readable"           on public.permissions for select to authenticated using (true);

-- profiles
create policy "profiles: read own tenant"      on public.profiles for select to authenticated using (tenant_id = current_tenant_id());
create policy profiles_select_self_or_tenant   on public.profiles for select to authenticated using (id = auth.uid() or tenant_id = current_tenant_id());
create policy profiles_update_self             on public.profiles for update to authenticated using (id = auth.uid());

-- project_messages (Chat)
create policy "chat: tenant members insert"    on public.project_messages for insert to authenticated with check (is_tenant_member(tenant_id) and user_id = auth.uid());
create policy "chat: tenant members read"      on public.project_messages for select to authenticated using (is_tenant_member(tenant_id));

-- qualifications
create policy "quals: hr manage"               on public.qualifications for all to authenticated using (is_tenant_member(tenant_id) and has_permission(auth.uid(), 'employees:update')) with check (is_tenant_member(tenant_id) and has_permission(auth.uid(), 'employees:update'));
create policy "quals: tenant read"             on public.qualifications for select to authenticated using (is_tenant_member(tenant_id));

-- role_permissions
create policy "role_perms: admin manage"       on public.role_permissions for all to authenticated
  using (exists (select 1 from public.roles r where r.id = role_permissions.role_id and is_tenant_member(r.tenant_id) and has_permission(auth.uid(), 'roles:manage')))
  with check (exists (select 1 from public.roles r where r.id = role_permissions.role_id and is_tenant_member(r.tenant_id) and has_permission(auth.uid(), 'roles:manage')));
create policy "role_perms: tenant read"        on public.role_permissions for select to authenticated
  using (exists (select 1 from public.roles r where r.id = role_permissions.role_id and is_tenant_member(r.tenant_id)));

-- roles
create policy "roles: admin manage"            on public.roles for all to authenticated using (is_tenant_member(tenant_id) and has_permission(auth.uid(), 'roles:manage')) with check (is_tenant_member(tenant_id) and has_permission(auth.uid(), 'roles:manage'));
create policy "roles: tenant read"             on public.roles for select to authenticated using (is_tenant_member(tenant_id));

-- site_members
create policy "sm: managers manage"            on public.site_members for all to authenticated
  using (exists (select 1 from public.sites s where s.id = site_members.site_id and is_tenant_member(s.tenant_id) and has_permission(auth.uid(), 'sites:update')))
  with check (exists (select 1 from public.sites s where s.id = site_members.site_id and is_tenant_member(s.tenant_id) and has_permission(auth.uid(), 'sites:update')));
create policy "sm: tenant read"                on public.site_members for select to authenticated
  using (exists (select 1 from public.sites s where s.id = site_members.site_id and is_tenant_member(s.tenant_id)));

-- sites
create policy projects_tenant_all              on public.sites for all to authenticated using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());

-- tasks
create policy tasks_tenant_all                 on public.tasks for all to authenticated using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());

-- tenants
create policy tenants_select_member            on public.tenants for select to authenticated using (is_tenant_member(id));

-- tenant_sso_domains
create policy "sso: admin manage"              on public.tenant_sso_domains for all to authenticated using (is_tenant_member(tenant_id) and has_permission(auth.uid(), 'sso:manage')) with check (is_tenant_member(tenant_id) and has_permission(auth.uid(), 'sso:manage'));
create policy "sso: tenant read"               on public.tenant_sso_domains for select to authenticated using (is_tenant_member(tenant_id));

-- time_entries
create policy time_entries_tenant_all          on public.time_entries for all to authenticated using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());

-- user_role_assignments
create policy "ura: admin manage"              on public.user_role_assignments for all to authenticated using (is_tenant_member(tenant_id) and has_permission(auth.uid(), 'roles:manage')) with check (is_tenant_member(tenant_id) and has_permission(auth.uid(), 'roles:manage'));
create policy "ura: tenant read"               on public.user_role_assignments for select to authenticated using (is_tenant_member(tenant_id));

-- weekly_assignments
create policy "plan: all read"                 on public.weekly_assignments for select to authenticated using (is_tenant_member(tenant_id) and has_permission(auth.uid(), 'plan:read_all'));
create policy "plan: own read"                 on public.weekly_assignments for select to authenticated using (user_id = auth.uid());
create policy "plan: write"                    on public.weekly_assignments for all to authenticated using (is_tenant_member(tenant_id) and has_permission(auth.uid(), 'plan:write')) with check (is_tenant_member(tenant_id) and has_permission(auth.uid(), 'plan:write'));

-- -----------------------------------------------------------------------------
-- 11. Updated-At Trigger
-- -----------------------------------------------------------------------------
create trigger sites_updated_at    before update on public.sites    for each row execute function public.update_updated_at_column();
create trigger absences_updated_at before update on public.absences for each row execute function public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 12. Permission-Katalog seed
-- -----------------------------------------------------------------------------
insert into public.permissions (key, resource, action, description) values
  ('absences:approve','absences','approve','Abwesenheiten genehmigen'),
  ('absences:own','absences','own','Eigene Abwesenheiten beantragen'),
  ('absences:read_all','absences','read_all','Alle Abwesenheiten sehen'),
  ('employees:create','employees','create','Mitarbeiter anlegen'),
  ('employees:deactivate','employees','deactivate','Mitarbeiter deaktivieren'),
  ('employees:read','employees','read','Mitarbeiter anzeigen'),
  ('employees:update','employees','update','Mitarbeiter bearbeiten'),
  ('plan:read_all','plan','read_all','Alle Wochenplanungen sehen'),
  ('plan:read_own','plan','read_own','Eigene Wochenplanung sehen'),
  ('plan:write','plan','write','Wochenplanung erstellen/aendern'),
  ('roles:manage','roles','manage','Rollen und Berechtigungen verwalten'),
  ('settings:manage','settings','manage','Betriebseinstellungen verwalten'),
  ('sites:chat','sites','chat','In Baustellen-Chat schreiben'),
  ('sites:create','sites','create','Baustellen erstellen'),
  ('sites:delete','sites','delete','Baustellen archivieren'),
  ('sites:read','sites','read','Baustellen anzeigen'),
  ('sites:update','sites','update','Baustellen bearbeiten'),
  ('sso:manage','sso','manage','SSO / SAML konfigurieren'),
  ('time:approve','time','approve','Zeitkorrekturen genehmigen'),
  ('time:own','time','own','Eigene Zeiten erfassen'),
  ('time:read_team','time','read_team','Zeiten des Teams sehen')
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- 13. Default-Rollen seed pro neuem Tenant
-- -----------------------------------------------------------------------------
create or replace function public.seed_default_roles(_tenant_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  role_defs jsonb := '[
    {"key":"unternehmensinhaber","name":"Unternehmensinhaber","perms":["*"]},
    {"key":"administrator","name":"Administrator","perms":["*"]},
    {"key":"personalverwaltung","name":"Personalverwaltung","perms":["employees:read","employees:create","employees:update","employees:deactivate","absences:read_all","absences:approve","plan:read_all"]},
    {"key":"buchhaltung","name":"Buchhaltung","perms":["employees:read","absences:read_all","time:read_team"]},
    {"key":"bauleiter","name":"Bauleiter","perms":["sites:read","sites:create","sites:update","sites:chat","time:own","time:read_team","time:approve","plan:read_all","plan:write","absences:own","absences:approve","employees:read"]},
    {"key":"vorarbeiter","name":"Vorarbeiter","perms":["sites:read","sites:chat","time:own","time:read_team","plan:read_own","absences:own","employees:read"]},
    {"key":"mitarbeiter","name":"Mitarbeiter","perms":["sites:read","sites:chat","time:own","plan:read_own","absences:own"]}
  ]'::jsonb;
  role_row jsonb;
  new_role_id uuid;
  perm_key text;
begin
  for role_row in select * from jsonb_array_elements(role_defs) loop
    insert into public.roles(tenant_id, key, name, is_system)
    values (_tenant_id, role_row->>'key', role_row->>'name', true)
    on conflict (tenant_id, key) do update set name = excluded.name
    returning id into new_role_id;

    delete from public.role_permissions where role_id = new_role_id;

    if (role_row->'perms'->>0) = '*' then
      insert into public.role_permissions(role_id, permission_key)
      select new_role_id, key from public.permissions;
    else
      for perm_key in select jsonb_array_elements_text(role_row->'perms') loop
        insert into public.role_permissions(role_id, permission_key)
        values (new_role_id, perm_key)
        on conflict do nothing;
      end loop;
    end if;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 14. Neuer User → Tenant, Profil, Owner-Rolle
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_tenant_id uuid;
  betrieb text;
  owner_role_id uuid;
begin
  betrieb := coalesce(new.raw_user_meta_data->>'betrieb', 'Mein Betrieb');
  insert into public.tenants(name) values (betrieb) returning id into new_tenant_id;
  insert into public.profiles(id, tenant_id, full_name)
    values (new.id, new_tenant_id, coalesce(new.raw_user_meta_data->>'full_name', new.email));

  perform public.seed_default_roles(new_tenant_id);

  select id into owner_role_id from public.roles
    where tenant_id = new_tenant_id and key = 'unternehmensinhaber';
  if owner_role_id is not null then
    insert into public.user_role_assignments(user_id, role_id, tenant_id)
      values (new.id, owner_role_id, new_tenant_id)
      on conflict do nothing;
  end if;
  return new;
end $$;

create or replace function public.on_tenant_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.seed_default_roles(new.id);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists tenants_seed_roles on public.tenants;
create trigger tenants_seed_roles
  after insert on public.tenants
  for each row execute function public.on_tenant_created();

-- -----------------------------------------------------------------------------
-- 15. Storage-Buckets (privat) + Policies
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('avatars','avatars', false),
  ('chat-images','chat-images', false),
  ('handwerk-files','handwerk-files', false)
on conflict (id) do nothing;

-- Avatare: jeder authentifizierte darf im eigenen tenant-Ordner lesen/schreiben.
-- Konvention im Frontend: erster Pfadteil = user-id.
create policy "avatars: read authenticated"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars');
create policy "avatars: user writes own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: user updates own"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: user deletes own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Chat-Bilder: alle authentifizierten Mitglieder dürfen lesen/schreiben.
create policy "chat-images: read authenticated"
  on storage.objects for select to authenticated
  using (bucket_id = 'chat-images');
create policy "chat-images: write authenticated"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-images');
create policy "chat-images: update own"
  on storage.objects for update to authenticated
  using (bucket_id = 'chat-images' and owner = auth.uid());
create policy "chat-images: delete own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'chat-images' and owner = auth.uid());

-- Sonstige Dateien
create policy "handwerk-files: read authenticated"
  on storage.objects for select to authenticated
  using (bucket_id = 'handwerk-files');
create policy "handwerk-files: write authenticated"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'handwerk-files');
create policy "handwerk-files: update own"
  on storage.objects for update to authenticated
  using (bucket_id = 'handwerk-files' and owner = auth.uid());
create policy "handwerk-files: delete own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'handwerk-files' and owner = auth.uid());

-- =============================================================================
-- Fertig. Nach dem Ausführen: einfach neuen User via Supabase Auth registrieren
-- (mit optional `betrieb` in raw_user_meta_data). Trigger legt Tenant + Profil
-- + Default-Rollen an und weist die Owner-Rolle zu.
-- =============================================================================
