-- Cache caller identity once per statement in legacy RLS policies instead of
-- evaluating auth.uid() again for every candidate row.

do $$
declare
  policy_row record;
  next_using text;
  next_check text;
  alter_sql text;
begin
  for policy_row in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        (coalesce(qual, '') like '%auth.uid()%'
          and coalesce(qual, '') not like '%SELECT auth.uid()%')
        or
        (coalesce(with_check, '') like '%auth.uid()%'
          and coalesce(with_check, '') not like '%SELECT auth.uid()%')
      )
  loop
    next_using := case
      when policy_row.qual is null then null
      else replace(policy_row.qual, 'auth.uid()', '(select auth.uid())')
    end;
    next_check := case
      when policy_row.with_check is null then null
      else replace(policy_row.with_check, 'auth.uid()', '(select auth.uid())')
    end;

    alter_sql := format(
      'alter policy %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
    if next_using is not null then
      alter_sql := alter_sql || format(' using (%s)', next_using);
    end if;
    if next_check is not null then
      alter_sql := alter_sql || format(' with check (%s)', next_check);
    end if;

    execute alter_sql;
  end loop;
end
$$;
