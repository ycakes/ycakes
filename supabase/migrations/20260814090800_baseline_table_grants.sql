-- Hosted Supabase projects get schema usage + CRUD grants to
-- anon/authenticated/service_role automatically at project provisioning
-- (confirmed via information_schema.role_table_grants: exactly select,
-- insert, update, delete -- never truncate/references/trigger, which
-- 20260814090500_missing_indexes_and_grants.sql already revokes from
-- anon/authenticated on purpose). RLS is the real access gate; these grants
-- just get every role past Postgres's own privilege check so RLS can run.
--
-- The local CLI/Docker stack does not reliably replicate that bootstrap --
-- discovered via a permission-denied error hitting even service_role
-- locally. Stating the grants explicitly here makes local dev
-- self-contained instead of depending on CLI/Docker-image behavior.
-- Re-granting an already-granted privilege is a no-op, so this is safe to
-- push to hosted too.

grant usage on schema public to anon, authenticated, service_role;

do $$
declare
  t text;
begin
  foreach t in array (select array_agg(tablename) from pg_tables where schemaname = 'public')
  loop
    execute format(
      'grant select, insert, update, delete on public.%I to anon, authenticated, service_role;',
      t
    );
  end loop;
end $$;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
