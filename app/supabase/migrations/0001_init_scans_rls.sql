-- DATUM — build-sequence step 1
-- Starter `scans` mirror table with Row-Level Security ENABLED.
--
-- This is intentionally minimal: just enough columns to prove the rented stack
-- and the cross-tenant isolation pattern end to end. The full mirror projection
-- (see /spec/schema.md) is maintained by n8n and lands in step 2.
--
-- The same policy SQL below runs unchanged in three places:
--   * production Supabase (where auth.jwt(), `anon`, `authenticated` already exist)
--   * local Supabase (`supabase db reset`)
--   * the hermetic isolation test (which first applies tests/sql/auth_shim.sql
--     to provide auth.jwt() + the roles on a plain Postgres)

create extension if not exists pgcrypto;

create table if not exists public.scans (
  id            uuid primary key default gen_random_uuid(),
  client_email  text not null,          -- scoping key ↔ authenticated contact email
  account       text,                   -- used for team views (step 6)
  address       text,
  status        text,
  created_at    timestamptz not null default now()
);

create index if not exists scans_client_email_idx on public.scans (client_email);
create index if not exists scans_account_idx on public.scans (account);

-- Defense in depth: the app reads via the anon/JWT client. Grant only SELECT to
-- the authenticated role; RLS below decides WHICH rows. The service role (used
-- only by trusted server jobs / n8n) bypasses RLS by design and is never used
-- for client-facing reads.
grant select on public.scans to authenticated;

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------
alter table public.scans enable row level security;
-- Force RLS even for the table owner, so nothing accidentally bypasses it.
alter table public.scans force row level security;

-- A session may read a scan row only when the row's client_email matches the
-- email claim in the authenticated JWT. This is the server-side, in-database
-- enforcement of cross-tenant isolation. There is deliberately NO write policy
-- for clients — the app never writes business data (n8n does).
drop policy if exists scans_select_own on public.scans;
create policy scans_select_own
  on public.scans
  for select
  to authenticated
  using (client_email = (auth.jwt() ->> 'email'));
