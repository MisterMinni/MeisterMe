-- Separate employment records from login identities and introduce tenant invitations.
-- Existing profile-backed employees are preserved and backfilled without changing their IDs.

create table public.tenant_memberships (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'disabled')),
  joined_at timestamptz not null default now(),
  disabled_at timestamptz,
  primary key (tenant_id, user_id)
);

create index tenant_memberships_user_status_idx
  on public.tenant_memberships(user_id, status, tenant_id);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  role_id uuid references public.roles(id) on delete set null,
  full_name text not null check (btrim(full_name) <> ''),
  email text,
  phone text,
  address text,
  employee_number text,
  entry_date date,
  exit_date date,
  weekly_hours numeric check (weekly_hours is null or weekly_hours >= 0),
  work_time_model text,
  vacation_days_per_year integer default 24
    check (vacation_days_per_year is null or vacation_days_per_year >= 0),
  cost_center text,
  subgroup text,
  state_code text default 'BW',
  status text not null default 'active'
    check (status in ('active', 'inactive', 'exited')),
  disabled_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index employees_tenant_status_name_idx
  on public.employees(tenant_id, status, full_name);
create index employees_role_id_idx on public.employees(role_id);
create unique index employees_tenant_employee_number_uidx
  on public.employees(tenant_id, employee_number)
  where employee_number is not null;

create table public.employee_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  email text not null check (email = lower(btrim(email)) and email <> ''),
  auth_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'accepted', 'expired', 'revoked', 'failed')),
  invited_by uuid references auth.users(id) on delete set null,
  sent_at timestamptz,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '1 hour'),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index employee_invitations_tenant_status_idx
  on public.employee_invitations(tenant_id, status, created_at desc);
create index employee_invitations_email_status_idx
  on public.employee_invitations(email, status, created_at desc);
create index employee_invitations_role_id_idx on public.employee_invitations(role_id);
create index employee_invitations_auth_user_id_idx on public.employee_invitations(auth_user_id);
create unique index employee_invitations_active_employee_uidx
  on public.employee_invitations(employee_id)
  where status in ('pending', 'sent');

-- Preserve all existing users as active tenant members and employment records.
insert into public.tenant_memberships (tenant_id, user_id, status, disabled_at)
select
  p.tenant_id,
  p.id,
  case when p.disabled_at is null then 'active' else 'disabled' end,
  p.disabled_at
from public.profiles p
where p.tenant_id is not null
on conflict (tenant_id, user_id) do update
set status = excluded.status,
    disabled_at = excluded.disabled_at;

insert into public.employees (
  id,
  tenant_id,
  auth_user_id,
  role_id,
  full_name,
  email,
  phone,
  address,
  employee_number,
  entry_date,
  exit_date,
  weekly_hours,
  work_time_model,
  vacation_days_per_year,
  cost_center,
  subgroup,
  state_code,
  status,
  disabled_at,
  created_by,
  created_at
)
select
  p.id,
  p.tenant_id,
  p.id,
  role_assignment.role_id,
  coalesce(nullif(btrim(p.full_name), ''), u.email, 'Mitarbeiter'),
  lower(u.email),
  p.phone,
  p.address,
  p.employee_number,
  p.entry_date,
  p.exit_date,
  p.weekly_hours,
  p.work_time_model,
  p.vacation_days_per_year,
  p.cost_center,
  p.subgroup,
  p.state_code,
  case when p.disabled_at is null then 'active' else 'inactive' end,
  p.disabled_at,
  p.id,
  p.created_at
from public.profiles p
join auth.users u on u.id = p.id
left join lateral (
  select ura.role_id
  from public.user_role_assignments ura
  where ura.user_id = p.id and ura.tenant_id = p.tenant_id
  order by ura.assigned_at
  limit 1
) role_assignment on true
where p.tenant_id is not null
on conflict (id) do nothing;

-- Weekly planning now supports employees who do not have an Auth identity.
alter table public.weekly_assignments
  add column employee_id uuid references public.employees(id) on delete cascade;

update public.weekly_assignments wa
set employee_id = e.id
from public.employees e
where wa.employee_id is null
  and e.auth_user_id = wa.user_id
  and e.tenant_id = wa.tenant_id;

alter table public.weekly_assignments alter column user_id drop not null;
create index weekly_assignments_employee_day_idx
  on public.weekly_assignments(employee_id, day);

drop policy if exists "plan: own read" on public.weekly_assignments;
create policy "plan: own read"
on public.weekly_assignments
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.employees e
    where e.id = employee_id
      and e.auth_user_id = (select auth.uid())
  )
);

-- Membership status is the authoritative gate for all tenant RLS helpers.
-- Privileged lookups live outside the exposed API schema; public wrappers remain invoker-safe.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.tenant_id
  from public.profiles p
  join public.tenant_memberships tm
    on tm.tenant_id = p.tenant_id
   and tm.user_id = p.id
   and tm.status = 'active'
   and tm.disabled_at is null
  where p.id = (select auth.uid())
    and p.disabled_at is null
$$;

create or replace function private.is_tenant_member(_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.tenant_memberships tm
      on tm.tenant_id = p.tenant_id
     and tm.user_id = p.id
     and tm.status = 'active'
     and tm.disabled_at is null
    where p.id = (select auth.uid())
      and p.tenant_id = _tenant_id
      and p.disabled_at is null
  )
$$;

create or replace function private.has_permission(_user_id uuid, _permission text)
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
    join public.tenant_memberships tm
      on tm.tenant_id = ura.tenant_id
     and tm.user_id = ura.user_id
     and tm.status = 'active'
     and tm.disabled_at is null
    join public.profiles p
      on p.id = ura.user_id
     and p.tenant_id = ura.tenant_id
     and p.disabled_at is null
    where ura.user_id = _user_id
      and ura.tenant_id = (select private.current_tenant_id())
      and rp.permission_key = _permission
  )
$$;

revoke execute on function private.current_tenant_id() from public, anon;
revoke execute on function private.is_tenant_member(uuid) from public, anon;
revoke execute on function private.has_permission(uuid, text) from public, anon;
grant execute on function private.current_tenant_id() to authenticated, service_role;
grant execute on function private.is_tenant_member(uuid) to authenticated, service_role;
grant execute on function private.has_permission(uuid, text) to authenticated, service_role;

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select private.current_tenant_id()
$$;

create or replace function public.is_tenant_member(_tenant_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_tenant_member(_tenant_id)
$$;

create or replace function public.has_permission(_user_id uuid, _permission text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.has_permission(_user_id, _permission)
$$;

-- Read access is deliberately narrow; mutations go through trusted server functions.
alter table public.tenant_memberships enable row level security;
alter table public.employees enable row level security;
alter table public.employee_invitations enable row level security;

grant select on public.tenant_memberships, public.employees, public.employee_invitations
  to authenticated;
grant all on public.tenant_memberships, public.employees, public.employee_invitations
  to service_role;

create policy "memberships: authorized read"
on public.tenant_memberships
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_permission((select auth.uid()), 'employees:read'))
  )
);

create policy "employees: authorized read"
on public.employees
for select
to authenticated
using (
  auth_user_id = (select auth.uid())
  or (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_permission((select auth.uid()), 'employees:read'))
  )
);

create policy "employee invitations: hr read"
on public.employee_invitations
for select
to authenticated
using (
  tenant_id = (select public.current_tenant_id())
  and (select public.has_permission((select auth.uid()), 'employees:read'))
);

-- Users may edit presentation fields, but cannot move themselves to a tenant or re-enable access.
revoke update on public.profiles from authenticated;
grant update (full_name, phone, avatar_url, address, state_code)
  on public.profiles to authenticated;

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
on public.profiles
for update
to authenticated
using (
  id = (select auth.uid())
  and disabled_at is null
)
with check (
  id = (select auth.uid())
  and tenant_id = (select public.current_tenant_id())
  and disabled_at is null
);

-- Auth user creation has two explicit paths: invited member or new business owner.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_tenant_id uuid;
  business_name text;
  owner_role_id uuid;
  pending_invitation public.employee_invitations%rowtype;
  display_name text;
begin
  select i.*
  into pending_invitation
  from public.employee_invitations i
  where i.email = lower(new.email)
    and i.status in ('pending', 'sent')
    and i.expires_at > now()
  order by i.created_at
  limit 1
  for update;

  if found then
    select e.full_name
    into display_name
    from public.employees e
    where e.id = pending_invitation.employee_id
      and e.tenant_id = pending_invitation.tenant_id;

    if display_name is null then
      raise exception 'Invitation employee does not belong to invitation tenant';
    end if;

    insert into public.profiles(id, tenant_id, full_name)
    values (new.id, pending_invitation.tenant_id, display_name)
    on conflict (id) do update
    set tenant_id = excluded.tenant_id,
        full_name = excluded.full_name,
        disabled_at = null;

    insert into public.tenant_memberships(tenant_id, user_id, status, disabled_at)
    values (pending_invitation.tenant_id, new.id, 'active', null)
    on conflict (tenant_id, user_id) do update
    set status = 'active', disabled_at = null;

    update public.employees
    set auth_user_id = new.id,
        email = lower(new.email),
        role_id = pending_invitation.role_id,
        status = 'active',
        disabled_at = null,
        updated_at = now()
    where id = pending_invitation.employee_id
      and tenant_id = pending_invitation.tenant_id;

    insert into public.user_role_assignments(user_id, role_id, tenant_id)
    values (new.id, pending_invitation.role_id, pending_invitation.tenant_id)
    on conflict do nothing;

    update public.employee_invitations
    set auth_user_id = new.id,
        updated_at = now()
    where id = pending_invitation.id;

    return new;
  end if;

  business_name := coalesce(
    nullif(btrim(new.raw_user_meta_data->>'betrieb'), ''),
    'Mein Betrieb'
  );
  display_name := coalesce(
    nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
    new.email,
    'Unternehmensinhaber'
  );

  insert into public.tenants(name)
  values (business_name)
  returning id into new_tenant_id;

  perform public.seed_default_roles(new_tenant_id);

  select r.id
  into owner_role_id
  from public.roles r
  where r.tenant_id = new_tenant_id
    and r.key = 'unternehmensinhaber';

  insert into public.profiles(id, tenant_id, full_name)
  values (new.id, new_tenant_id, display_name);

  insert into public.tenant_memberships(tenant_id, user_id, status)
  values (new_tenant_id, new.id, 'active');

  if owner_role_id is not null then
    insert into public.user_role_assignments(user_id, role_id, tenant_id)
    values (new.id, owner_role_id, new_tenant_id)
    on conflict do nothing;
  end if;

  insert into public.employees(
    id, tenant_id, auth_user_id, role_id, full_name, email, created_by
  )
  values (
    new.id, new_tenant_id, new.id, owner_role_id, display_name, lower(new.email), new.id
  );

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;

-- Service-only session revocation used during employee offboarding.
create or replace function public.revoke_user_sessions(_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.sessions where user_id = _user_id
$$;

revoke execute on function public.revoke_user_sessions(uuid)
  from public, anon, authenticated;
grant execute on function public.revoke_user_sessions(uuid)
  to service_role;

