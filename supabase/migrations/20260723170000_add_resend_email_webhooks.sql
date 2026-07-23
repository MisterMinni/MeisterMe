-- Resend inbound/outbound email webhook persistence and tenant routing.

alter table public.communications
  add column sender text;

alter table public.communications
  add constraint communications_provider_message_id_key unique (provider_message_id);

alter table public.communications
  add constraint communications_id_tenant_key unique (id, tenant_id);

create index communications_customer_tenant_idx
  on public.communications (customer_id, tenant_id);

create index customers_tenant_lower_email_idx
  on public.customers (tenant_id, lower(btrim(email)))
  where email is not null;

create index customer_contacts_tenant_lower_email_idx
  on public.customer_contacts (tenant_id, lower(btrim(email)))
  where email is not null;

create table public.tenant_mailboxes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email_address text not null unique,
  provider text not null default 'resend',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_mailboxes_email_normalized_check
    check (email_address = lower(btrim(email_address))),
  constraint tenant_mailboxes_email_format_check
    check (email_address ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  constraint tenant_mailboxes_provider_check
    check (provider in ('resend'))
);

create index tenant_mailboxes_tenant_idx
  on public.tenant_mailboxes (tenant_id);

create table public.inbound_emails (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid,
  communication_id uuid,
  provider text not null default 'resend',
  provider_message_id text not null unique,
  message_id text,
  sender text not null,
  sender_email text not null,
  recipients jsonb not null default '[]'::jsonb,
  cc jsonb not null default '[]'::jsonb,
  bcc jsonb not null default '[]'::jsonb,
  subject text,
  body_text text,
  body_html text,
  email_headers jsonb not null default '{}'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  received_at timestamptz not null,
  status text not null default 'unmatched',
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inbound_emails_provider_check
    check (provider in ('resend')),
  constraint inbound_emails_status_check
    check (status in ('matched', 'unmatched', 'failed')),
  constraint inbound_emails_customer_tenant_fkey
    foreign key (customer_id, tenant_id)
    references public.customers(id, tenant_id) on delete restrict,
  constraint inbound_emails_communication_tenant_fkey
    foreign key (communication_id, tenant_id)
    references public.communications(id, tenant_id) on delete set null (communication_id)
);

create index inbound_emails_tenant_status_received_idx
  on public.inbound_emails (tenant_id, status, received_at desc);

create index inbound_emails_customer_tenant_idx
  on public.inbound_emails (customer_id, tenant_id)
  where customer_id is not null;

create index inbound_emails_communication_tenant_idx
  on public.inbound_emails (communication_id, tenant_id)
  where communication_id is not null;

create table public.email_webhook_events (
  svix_id text primary key,
  provider text not null default 'resend',
  event_type text not null,
  provider_message_id text,
  tenant_id uuid references public.tenants(id) on delete cascade,
  status text not null default 'processing',
  attempts smallint not null default 1,
  last_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint email_webhook_events_provider_check
    check (provider in ('resend')),
  constraint email_webhook_events_status_check
    check (status in ('processing', 'processed', 'ignored', 'failed', 'unroutable')),
  constraint email_webhook_events_attempts_check
    check (attempts > 0)
);

create index email_webhook_events_tenant_received_idx
  on public.email_webhook_events (tenant_id, received_at desc)
  where tenant_id is not null;

create index email_webhook_events_provider_message_idx
  on public.email_webhook_events (provider_message_id)
  where provider_message_id is not null;

create trigger tenant_mailboxes_set_updated_at
  before update on public.tenant_mailboxes
  for each row execute function public.update_updated_at_column();

create trigger inbound_emails_set_updated_at
  before update on public.inbound_emails
  for each row execute function public.update_updated_at_column();

create trigger email_webhook_events_set_updated_at
  before update on public.email_webhook_events
  for each row execute function public.update_updated_at_column();

alter table public.tenant_mailboxes enable row level security;
alter table public.inbound_emails enable row level security;
alter table public.email_webhook_events enable row level security;

create policy tenant_mailboxes_tenant_select
  on public.tenant_mailboxes
  for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_permission((select auth.uid()), 'communications:read'))
  );

create policy tenant_mailboxes_tenant_insert
  on public.tenant_mailboxes
  for insert to authenticated
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_permission((select auth.uid()), 'roles:manage'))
  );

create policy tenant_mailboxes_tenant_update
  on public.tenant_mailboxes
  for update to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_permission((select auth.uid()), 'roles:manage'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_permission((select auth.uid()), 'roles:manage'))
  );

create policy tenant_mailboxes_tenant_delete
  on public.tenant_mailboxes
  for delete to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_permission((select auth.uid()), 'roles:manage'))
  );

create policy inbound_emails_tenant_select
  on public.inbound_emails
  for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_permission((select auth.uid()), 'communications:read'))
  );

create policy email_webhook_events_admin_select
  on public.email_webhook_events
  for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_permission((select auth.uid()), 'roles:manage'))
  );

grant select, insert, update, delete on public.tenant_mailboxes to authenticated;
grant select on public.inbound_emails, public.email_webhook_events to authenticated;
grant all on public.tenant_mailboxes, public.inbound_emails, public.email_webhook_events to service_role;

revoke all on public.tenant_mailboxes, public.inbound_emails, public.email_webhook_events from anon;

create or replace function public.resolve_inbound_customer(
  _tenant_id uuid,
  _email text
)
returns table (customer_id uuid)
language sql
stable
security invoker
set search_path = ''
as $$
  select matches.customer_id
  from (
    select c.id as customer_id
    from public.customers c
    where c.tenant_id = _tenant_id
      and lower(btrim(c.email)) = lower(btrim(_email))
    union
    select cc.customer_id
    from public.customer_contacts cc
    where cc.tenant_id = _tenant_id
      and lower(btrim(cc.email)) = lower(btrim(_email))
  ) matches
  limit 2;
$$;

revoke all on function public.resolve_inbound_customer(uuid, text) from public, anon, authenticated;
grant execute on function public.resolve_inbound_customer(uuid, text) to service_role;

create or replace function public.link_inbound_email_to_customer(
  _inbound_email_id uuid,
  _customer_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  inbound_record public.inbound_emails%rowtype;
  tenant_uuid uuid;
  communication_uuid uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  tenant_uuid := (select public.current_tenant_id());

  if tenant_uuid is null
     or not (select public.has_permission((select auth.uid()), 'communications:write')) then
    raise exception 'Missing permission: communications:write';
  end if;

  select *
  into inbound_record
  from public.inbound_emails
  where id = _inbound_email_id
    and tenant_id = tenant_uuid
  for update;

  if not found then
    raise exception 'Inbound email not found';
  end if;

  if not exists (
    select 1
    from public.customers
    where id = _customer_id
      and tenant_id = tenant_uuid
  ) then
    raise exception 'Customer not found';
  end if;

  if inbound_record.communication_id is null then
    insert into public.communications (
      tenant_id,
      customer_id,
      channel,
      direction,
      status,
      subject,
      body,
      sender,
      recipients,
      attachments,
      sent_at,
      provider_message_id
    ) values (
      tenant_uuid,
      _customer_id,
      'email',
      'inbound',
      'received',
      inbound_record.subject,
      inbound_record.body_text,
      inbound_record.sender,
      inbound_record.recipients,
      inbound_record.attachments,
      inbound_record.received_at,
      inbound_record.provider_message_id
    )
    on conflict (provider_message_id) do update
      set customer_id = excluded.customer_id,
          updated_at = now()
    returning id into communication_uuid;
  else
    communication_uuid := inbound_record.communication_id;
    update public.communications
      set customer_id = _customer_id,
          updated_at = now()
      where id = communication_uuid
        and tenant_id = tenant_uuid;
  end if;

  update public.inbound_emails
    set customer_id = _customer_id,
        communication_id = communication_uuid,
        status = 'matched',
        error_message = null,
        updated_at = now()
    where id = inbound_record.id;

  return communication_uuid;
end;
$$;

revoke all on function public.link_inbound_email_to_customer(uuid, uuid) from public, anon;
grant execute on function public.link_inbound_email_to_customer(uuid, uuid) to authenticated;
grant execute on function public.link_inbound_email_to_customer(uuid, uuid) to service_role;
