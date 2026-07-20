drop policy if exists "employee invitations: hr read" on public.employee_invitations;

create policy "employee invitations: authorized read"
on public.employee_invitations
for select
to authenticated
using (
  auth_user_id = (select auth.uid())
  or (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_permission((select auth.uid()), 'employees:read'))
  )
);

