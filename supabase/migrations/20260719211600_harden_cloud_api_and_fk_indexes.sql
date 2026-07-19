-- Remove legacy anonymous Data API grants and cover every foreign key with an
-- index whose leading columns match the constraint. RLS remains the row-level
-- boundary for signed-in users.

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

alter default privileges for role postgres in schema public
  revoke all on tables from anon;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon;

-- Keep the tenant helpers privileged to avoid RLS recursion, but lock their
-- lookup path to fully qualified objects and to the caller's auth identity.
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select tenant_id
  from public.profiles
  where id = (select auth.uid())
$$;

create or replace function public.is_tenant_member(_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and tenant_id = _tenant_id
  )
$$;

revoke execute on function public.current_tenant_id() from public, anon;
revoke execute on function public.is_tenant_member(uuid) from public, anon;
grant execute on function public.current_tenant_id() to authenticated;
grant execute on function public.is_tenant_member(uuid) to authenticated;

do $$
declare
  fk record;
  index_name text;
begin
  for fk in
    select
      n.nspname as schema_name,
      t.relname as table_name,
      c.conname,
      c.conrelid,
      string_agg(quote_ident(a.attname), ', ' order by u.ordinality) as columns_sql
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    join lateral unnest(c.conkey) with ordinality u(attnum, ordinality) on true
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = u.attnum
    where c.contype = 'f'
      and n.nspname = 'public'
      and not exists (
        select 1
        from pg_index i
        where i.indrelid = c.conrelid
          and i.indisvalid
          and i.indisready
          and i.indpred is null
          and (i.indkey::smallint[])[0:cardinality(c.conkey) - 1] = c.conkey
      )
    group by n.nspname, t.relname, c.conname, c.conrelid
  loop
    index_name := left('idx_fk_' || fk.table_name || '_' || fk.conname, 54)
      || '_' || substr(md5(fk.conrelid::text || fk.conname), 1, 8);
    execute format(
      'create index %I on %I.%I (%s)',
      index_name,
      fk.schema_name,
      fk.table_name,
      fk.columns_sql
    );
  end loop;
end
$$;
