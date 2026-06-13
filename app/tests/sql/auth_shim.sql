-- TEST-ONLY auth shim.
--
-- Real Supabase already provides the `auth` schema, `auth.jwt()`, and the `anon`
-- / `authenticated` roles. A plain Postgres (used by the hermetic isolation test
-- and CI) does not — so we recreate just enough of them here, matching Supabase
-- semantics, so the PRODUCTION migration's RLS policy can run UNCHANGED.
--
-- This file must NEVER be applied to a real Supabase project.

create schema if not exists auth;

-- Mirror Supabase: read JWT claims from the per-transaction GUC.
create or replace function auth.jwt()
returns jsonb
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), ''),
    '{}'
  )::jsonb
$$;

-- Roles Supabase ships with. NOLOGIN: assumed via SET ROLE during a request.
do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end
$$;

grant usage on schema public to authenticated, anon;
grant usage on schema auth to authenticated, anon;
