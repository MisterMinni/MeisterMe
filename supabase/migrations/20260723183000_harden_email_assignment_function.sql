-- Keep the assignment RPC under caller permissions so RLS remains authoritative.

alter function public.link_inbound_email_to_customer(uuid, uuid)
  security invoker;

create policy inbound_emails_tenant_update
  on public.inbound_emails
  for update to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_permission((select auth.uid()), 'communications:write'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_permission((select auth.uid()), 'communications:write'))
  );

grant update (
  customer_id,
  communication_id,
  status,
  error_message,
  updated_at
) on public.inbound_emails to authenticated;
