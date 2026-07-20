-- Extend MeisterMe with the commercial workflow that was removed from the
-- early prototype: CRM -> measurement -> offer -> invoice -> communication.
-- Every exposed table has explicit grants and tenant-aware RLS.

insert into public.permissions (key, resource, action, description) values
  ('customers:read', 'customers', 'read', 'Kunden lesen'),
  ('customers:write', 'customers', 'write', 'Kunden anlegen und bearbeiten'),
  ('measurements:read', 'measurements', 'read', 'Aufmaße lesen'),
  ('measurements:write', 'measurements', 'write', 'Aufmaße anlegen und bearbeiten'),
  ('materials:read', 'materials', 'read', 'Materialstamm lesen'),
  ('materials:write', 'materials', 'write', 'Materialstamm bearbeiten'),
  ('offers:read', 'offers', 'read', 'Angebote lesen'),
  ('offers:write', 'offers', 'write', 'Angebote anlegen und bearbeiten'),
  ('invoices:read', 'invoices', 'read', 'Rechnungen lesen'),
  ('invoices:write', 'invoices', 'write', 'Rechnungen anlegen und bearbeiten'),
  ('communications:read', 'communications', 'read', 'Kundenkommunikation lesen'),
  ('communications:write', 'communications', 'write', 'Kundenkommunikation erstellen'),
  ('automation:manage', 'automation', 'manage', 'Automationen verwalten'),
  ('ai:use', 'ai', 'use', 'KI-Werkzeuge verwenden')
on conflict (key) do update set
  resource = excluded.resource,
  action = excluded.action,
  description = excluded.description;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_number text,
  kind text not null default 'private' check (kind in ('private', 'business', 'public')),
  company_name text,
  first_name text,
  last_name text,
  email text,
  phone text,
  mobile text,
  billing_address jsonb not null default '{}'::jsonb,
  site_address jsonb not null default '{}'::jsonb,
  notes text,
  source text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_name_present check (
    nullif(trim(coalesce(company_name, '')), '') is not null
    or nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), '') is not null
  ),
  constraint customers_tenant_number_key unique (tenant_id, customer_number),
  constraint customers_id_tenant_key unique (id, tenant_id)
);

create table public.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid not null,
  full_name text not null,
  role text,
  email text,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_contacts_customer_tenant_fkey
    foreign key (customer_id, tenant_id)
    references public.customers(id, tenant_id) on delete cascade
);

alter table public.sites
  add constraint sites_id_tenant_key unique (id, tenant_id);

alter table public.sites
  add constraint sites_customer_tenant_fkey
  foreign key (customer_id, tenant_id)
  references public.customers(id, tenant_id) on delete restrict;

create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  site_id uuid,
  customer_id uuid,
  created_by uuid not null references auth.users(id),
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'review', 'approved', 'archived')),
  captured_at timestamptz not null default now(),
  notes text,
  ai_summary text,
  totals jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint measurements_site_tenant_fkey
    foreign key (site_id, tenant_id)
    references public.sites(id, tenant_id) on delete cascade,
  constraint measurements_customer_tenant_fkey
    foreign key (customer_id, tenant_id)
    references public.customers(id, tenant_id) on delete restrict,
  constraint measurements_id_tenant_key unique (id, tenant_id)
);

create table public.measurement_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  measurement_id uuid not null,
  position integer not null default 1 check (position > 0),
  area text,
  description text not null,
  quantity numeric(14,3) not null default 0 check (quantity >= 0),
  unit text not null default 'm²',
  length numeric(14,3),
  width numeric(14,3),
  height numeric(14,3),
  deduction numeric(14,3) not null default 0 check (deduction >= 0),
  source text not null default 'manual' check (source in ('manual', 'voice', 'photo', 'plan', 'import')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint measurement_items_measurement_tenant_fkey
    foreign key (measurement_id, tenant_id)
    references public.measurements(id, tenant_id) on delete cascade,
  constraint measurement_items_position_key unique (measurement_id, position)
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  sku text,
  name text not null,
  trade public.gewerk,
  category text,
  unit text not null default 'Stk',
  purchase_price numeric(14,2) not null default 0 check (purchase_price >= 0),
  sales_price numeric(14,2) not null default 0 check (sales_price >= 0),
  waste_percent numeric(6,2) not null default 0 check (waste_percent between 0 and 100),
  supplier text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint materials_tenant_sku_key unique (tenant_id, sku)
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid not null,
  site_id uuid,
  measurement_id uuid,
  created_by uuid not null references auth.users(id),
  offer_number text not null,
  status text not null default 'draft' check (status in ('draft', 'review', 'sent', 'accepted', 'rejected', 'expired')),
  subject text not null,
  introduction text,
  closing_text text,
  valid_until date,
  net_amount numeric(14,2) not null default 0 check (net_amount >= 0),
  tax_rate numeric(6,3) not null default 19 check (tax_rate between 0 and 100),
  tax_amount numeric(14,2) not null default 0 check (tax_amount >= 0),
  gross_amount numeric(14,2) not null default 0 check (gross_amount >= 0),
  sent_at timestamptz,
  accepted_at timestamptz,
  ai_generated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offers_customer_tenant_fkey
    foreign key (customer_id, tenant_id)
    references public.customers(id, tenant_id) on delete restrict,
  constraint offers_site_tenant_fkey
    foreign key (site_id, tenant_id)
    references public.sites(id, tenant_id) on delete restrict,
  constraint offers_measurement_tenant_fkey
    foreign key (measurement_id, tenant_id)
    references public.measurements(id, tenant_id) on delete restrict,
  constraint offers_tenant_number_key unique (tenant_id, offer_number),
  constraint offers_id_tenant_key unique (id, tenant_id)
);

create table public.offer_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  offer_id uuid not null,
  position integer not null check (position > 0),
  kind text not null default 'service' check (kind in ('title', 'text', 'service', 'material', 'subtotal')),
  description text not null,
  quantity numeric(14,3) not null default 1 check (quantity >= 0),
  unit text not null default 'Stk',
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  discount_percent numeric(6,2) not null default 0 check (discount_percent between 0 and 100),
  total numeric(14,2) generated always as
    (round(quantity * unit_price * (1 - discount_percent / 100), 2)) stored,
  source text not null default 'manual' check (source in ('manual', 'ai', 'catalog', 'measurement')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offer_items_offer_tenant_fkey
    foreign key (offer_id, tenant_id)
    references public.offers(id, tenant_id) on delete cascade,
  constraint offer_items_position_key unique (offer_id, position)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid not null,
  site_id uuid,
  offer_id uuid,
  created_by uuid not null references auth.users(id),
  invoice_number text not null,
  status text not null default 'draft' check (status in ('draft', 'review', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled')),
  invoice_date date not null default current_date,
  due_date date,
  subject text not null,
  net_amount numeric(14,2) not null default 0 check (net_amount >= 0),
  tax_rate numeric(6,3) not null default 19 check (tax_rate between 0 and 100),
  tax_amount numeric(14,2) not null default 0 check (tax_amount >= 0),
  gross_amount numeric(14,2) not null default 0 check (gross_amount >= 0),
  paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0),
  issued_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_customer_tenant_fkey
    foreign key (customer_id, tenant_id)
    references public.customers(id, tenant_id) on delete restrict,
  constraint invoices_site_tenant_fkey
    foreign key (site_id, tenant_id)
    references public.sites(id, tenant_id) on delete restrict,
  constraint invoices_offer_tenant_fkey
    foreign key (offer_id, tenant_id)
    references public.offers(id, tenant_id) on delete restrict,
  constraint invoices_tenant_number_key unique (tenant_id, invoice_number),
  constraint invoices_id_tenant_key unique (id, tenant_id)
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  invoice_id uuid not null,
  position integer not null check (position > 0),
  description text not null,
  quantity numeric(14,3) not null default 1 check (quantity >= 0),
  unit text not null default 'Stk',
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  discount_percent numeric(6,2) not null default 0 check (discount_percent between 0 and 100),
  total numeric(14,2) generated always as
    (round(quantity * unit_price * (1 - discount_percent / 100), 2)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoice_items_invoice_tenant_fkey
    foreign key (invoice_id, tenant_id)
    references public.invoices(id, tenant_id) on delete cascade,
  constraint invoice_items_position_key unique (invoice_id, position)
);

create table public.communications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid not null,
  site_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  channel text not null check (channel in ('email', 'sms', 'phone', 'letter', 'portal')),
  direction text not null default 'outbound' check (direction in ('inbound', 'outbound')),
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'sent', 'delivered', 'failed', 'received')),
  subject text,
  body text,
  recipients jsonb not null default '[]'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  scheduled_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communications_customer_tenant_fkey
    foreign key (customer_id, tenant_id)
    references public.customers(id, tenant_id) on delete restrict,
  constraint communications_site_tenant_fkey
    foreign key (site_id, tenant_id)
    references public.sites(id, tenant_id) on delete restrict
);

create table public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  trigger_event text not null,
  channel text not null check (channel in ('email', 'sms', 'notification')),
  enabled boolean not null default true,
  conditions jsonb not null default '{}'::jsonb,
  subject_template text,
  body_template text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint automation_rules_tenant_name_key unique (tenant_id, name)
);

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  tool text not null,
  provider text,
  model text,
  status text not null check (status in ('started', 'completed', 'failed')),
  input_metadata jsonb not null default '{}'::jsonb,
  output_metadata jsonb not null default '{}'::jsonb,
  prompt_tokens integer check (prompt_tokens is null or prompt_tokens >= 0),
  completion_tokens integer check (completion_tokens is null or completion_tokens >= 0),
  error_code text,
  created_at timestamptz not null default now()
);

create index customers_tenant_name_idx on public.customers (tenant_id, company_name, last_name);
create index customers_created_by_idx on public.customers (created_by);
create index customer_contacts_tenant_customer_idx on public.customer_contacts (tenant_id, customer_id);
create index sites_tenant_customer_idx on public.sites (tenant_id, customer_id);
create index measurements_tenant_site_idx on public.measurements (tenant_id, site_id, captured_at desc);
create index measurements_tenant_customer_idx on public.measurements (tenant_id, customer_id);
create index measurements_created_by_idx on public.measurements (created_by);
create index measurement_items_tenant_measurement_idx on public.measurement_items (tenant_id, measurement_id);
create index materials_tenant_active_idx on public.materials (tenant_id, active, name);
create index offers_tenant_status_idx on public.offers (tenant_id, status, created_at desc);
create index offers_tenant_customer_idx on public.offers (tenant_id, customer_id);
create index offers_tenant_site_idx on public.offers (tenant_id, site_id);
create index offers_tenant_measurement_idx on public.offers (tenant_id, measurement_id);
create index offers_created_by_idx on public.offers (created_by);
create index offer_items_tenant_offer_idx on public.offer_items (tenant_id, offer_id);
create index invoices_tenant_status_idx on public.invoices (tenant_id, status, due_date);
create index invoices_tenant_customer_idx on public.invoices (tenant_id, customer_id);
create index invoices_tenant_site_idx on public.invoices (tenant_id, site_id);
create index invoices_tenant_offer_idx on public.invoices (tenant_id, offer_id);
create index invoices_created_by_idx on public.invoices (created_by);
create index invoice_items_tenant_invoice_idx on public.invoice_items (tenant_id, invoice_id);
create index communications_tenant_customer_idx on public.communications (tenant_id, customer_id, created_at desc);
create index communications_tenant_site_idx on public.communications (tenant_id, site_id);
create index communications_created_by_idx on public.communications (created_by);
create index automation_rules_tenant_enabled_idx on public.automation_rules (tenant_id, enabled);
create index automation_rules_created_by_idx on public.automation_rules (created_by);
create index ai_runs_tenant_user_idx on public.ai_runs (tenant_id, user_id, created_at desc);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'customers', 'customer_contacts', 'measurements', 'measurement_items',
    'materials', 'offers', 'offer_items', 'invoices', 'invoice_items',
    'communications', 'automation_rules'
  ] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.update_updated_at_column()',
      table_name || '_set_updated_at',
      table_name
    );
  end loop;
end $$;

do $$
declare
  access record;
begin
  for access in
    select * from (values
      ('customers', 'customers:read', 'customers:write'),
      ('customer_contacts', 'customers:read', 'customers:write'),
      ('measurements', 'measurements:read', 'measurements:write'),
      ('measurement_items', 'measurements:read', 'measurements:write'),
      ('materials', 'materials:read', 'materials:write'),
      ('offers', 'offers:read', 'offers:write'),
      ('offer_items', 'offers:read', 'offers:write'),
      ('invoices', 'invoices:read', 'invoices:write'),
      ('invoice_items', 'invoices:read', 'invoices:write'),
      ('communications', 'communications:read', 'communications:write'),
      ('automation_rules', 'automation:manage', 'automation:manage')
    ) as permissions(table_name, read_permission, write_permission)
  loop
    execute format('alter table public.%I enable row level security', access.table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (tenant_id = (select public.current_tenant_id()) and (select public.has_permission((select auth.uid()), %L)))',
      access.table_name || '_tenant_select', access.table_name, access.read_permission
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (tenant_id = (select public.current_tenant_id()) and (select public.has_permission((select auth.uid()), %L)))',
      access.table_name || '_tenant_insert', access.table_name, access.write_permission
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (tenant_id = (select public.current_tenant_id()) and (select public.has_permission((select auth.uid()), %L))) with check (tenant_id = (select public.current_tenant_id()) and (select public.has_permission((select auth.uid()), %L)))',
      access.table_name || '_tenant_update', access.table_name, access.write_permission, access.write_permission
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (tenant_id = (select public.current_tenant_id()) and (select public.has_permission((select auth.uid()), %L)))',
      access.table_name || '_tenant_delete', access.table_name, access.write_permission
    );
  end loop;
end $$;

alter table public.ai_runs enable row level security;
create policy ai_runs_self_insert on public.ai_runs
  for insert to authenticated
  with check (
    tenant_id = (select public.current_tenant_id())
    and user_id = (select auth.uid())
    and (select public.has_permission((select auth.uid()), 'ai:use'))
  );
create policy ai_runs_self_or_admin_select on public.ai_runs
  for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (
      user_id = (select auth.uid())
      or (select public.has_permission((select auth.uid()), 'roles:manage'))
    )
  );

grant select, insert, update, delete on table
  public.customers,
  public.customer_contacts,
  public.measurements,
  public.measurement_items,
  public.materials,
  public.offers,
  public.offer_items,
  public.invoices,
  public.invoice_items,
  public.communications,
  public.automation_rules
to authenticated;

grant select, insert on public.ai_runs to authenticated;

grant all on table
  public.customers,
  public.customer_contacts,
  public.measurements,
  public.measurement_items,
  public.materials,
  public.offers,
  public.offer_items,
  public.invoices,
  public.invoice_items,
  public.communications,
  public.automation_rules,
  public.ai_runs
to service_role;

revoke all on table
  public.customers,
  public.customer_contacts,
  public.measurements,
  public.measurement_items,
  public.materials,
  public.offers,
  public.offer_items,
  public.invoices,
  public.invoice_items,
  public.communications,
  public.automation_rules,
  public.ai_runs
from anon;

-- Existing auth helpers stay in public because historical policies reference
-- them. They are hardened and only the non-mutating helpers remain callable by
-- authenticated users.
create or replace function public.has_permission(_user_id uuid, _permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select _user_id = (select auth.uid()) and exists (
    select 1
    from public.user_role_assignments ura
    join public.role_permissions rp on rp.role_id = ura.role_id
    where ura.user_id = _user_id
      and ura.tenant_id = (select public.current_tenant_id())
      and rp.permission_key = _permission
  )
$$;

revoke execute on all functions in schema public from public, anon;
revoke execute on function public.seed_default_roles(uuid) from authenticated;
revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.on_tenant_created() from authenticated;
grant execute on function public.current_tenant_id() to authenticated;
grant execute on function public.is_tenant_member(uuid) to authenticated;
grant execute on function public.has_permission(uuid, text) to authenticated;

create or replace function public.seed_default_roles(_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  role_defs jsonb := '[
    {"key":"unternehmensinhaber","name":"Unternehmensinhaber","perms":["*"]},
    {"key":"administrator","name":"Administrator","perms":["*"]},
    {"key":"personalverwaltung","name":"Personalverwaltung","perms":["employees:read","employees:create","employees:update","employees:deactivate","absences:read_all","absences:approve","plan:read_all","ai:use"]},
    {"key":"buchhaltung","name":"Buchhaltung","perms":["employees:read","absences:read_all","time:read_team","customers:read","offers:read","offers:write","invoices:read","invoices:write","communications:read","ai:use"]},
    {"key":"bauleiter","name":"Bauleiter","perms":["sites:read","sites:create","sites:update","sites:chat","time:own","time:read_team","time:approve","plan:read_all","plan:write","absences:own","absences:approve","employees:read","customers:read","measurements:read","measurements:write","materials:read","offers:read","communications:read","communications:write","ai:use"]},
    {"key":"vorarbeiter","name":"Vorarbeiter","perms":["sites:read","sites:chat","time:own","time:read_team","plan:read_own","absences:own","employees:read","measurements:read","measurements:write","materials:read","ai:use"]},
    {"key":"mitarbeiter","name":"Mitarbeiter","perms":["sites:read","sites:chat","time:own","plan:read_own","absences:own","ai:use"]}
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
end
$$;

-- New permissions for existing and future system roles.
insert into public.role_permissions (role_id, permission_key)
select r.id, p.permission_key
from public.roles r
cross join lateral (
  select unnest(
    case r.key
      when 'unternehmensinhaber' then array[
        'customers:read','customers:write','measurements:read','measurements:write',
        'materials:read','materials:write','offers:read','offers:write',
        'invoices:read','invoices:write','communications:read','communications:write',
        'automation:manage','ai:use'
      ]::text[]
      when 'administrator' then array[
        'customers:read','customers:write','measurements:read','measurements:write',
        'materials:read','materials:write','offers:read','offers:write',
        'invoices:read','invoices:write','communications:read','communications:write',
        'automation:manage','ai:use'
      ]::text[]
      when 'buchhaltung' then array[
        'customers:read','offers:read','offers:write','invoices:read','invoices:write',
        'communications:read','ai:use'
      ]::text[]
      when 'bauleiter' then array[
        'customers:read','measurements:read','measurements:write','materials:read',
        'offers:read','communications:read','communications:write','ai:use'
      ]::text[]
      when 'vorarbeiter' then array[
        'measurements:read','measurements:write','materials:read','ai:use'
      ]::text[]
      else array['ai:use']::text[]
    end
  ) as permission_key
) p
where r.is_system
on conflict do nothing;
