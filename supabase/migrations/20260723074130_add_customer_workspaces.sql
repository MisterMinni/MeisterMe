-- One tenant-scoped, reusable working memory per customer. Raw operational
-- data stays in the source tables; this table stores the curated briefing.
create table public.customer_workspaces (
  customer_id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  ai_summary text,
  needs jsonb not null default '[]'::jsonb,
  preferences jsonb not null default '[]'::jsonb,
  behavior_patterns jsonb not null default '[]'::jsonb,
  cost_profile jsonb not null default '{}'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  opportunities jsonb not null default '[]'::jsonb,
  recommended_actions jsonb not null default '[]'::jsonb,
  source_stats jsonb not null default '{}'::jsonb,
  manual_notes text,
  analyzed_at timestamptz,
  analyzed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_workspaces_customer_tenant_fkey
    foreign key (customer_id, tenant_id)
    references public.customers(id, tenant_id) on delete cascade,
  constraint customer_workspaces_customer_tenant_key unique (customer_id, tenant_id)
);

create index customer_workspaces_tenant_analyzed_idx
  on public.customer_workspaces (tenant_id, analyzed_at desc);

create trigger customer_workspaces_set_updated_at
  before update on public.customer_workspaces
  for each row execute function public.update_updated_at_column();

alter table public.customer_workspaces enable row level security;

create policy customer_workspaces_tenant_select
  on public.customer_workspaces
  for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_permission((select auth.uid()), 'customers:read'))
  );

create policy customer_workspaces_tenant_insert
  on public.customer_workspaces
  for insert to authenticated
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_permission((select auth.uid()), 'customers:write'))
  );

create policy customer_workspaces_tenant_update
  on public.customer_workspaces
  for update to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_permission((select auth.uid()), 'customers:write'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_permission((select auth.uid()), 'customers:write'))
  );

create policy customer_workspaces_tenant_delete
  on public.customer_workspaces
  for delete to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_permission((select auth.uid()), 'customers:write'))
  );

grant select, insert, update, delete on public.customer_workspaces to authenticated;
grant all on public.customer_workspaces to service_role;
revoke all on public.customer_workspaces from anon;
