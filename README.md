# DATUM — Client Portal + Ops Admin

Membership/portal + admin layer for **DATUM**, an architect-run 3D interior-scanning service in
New York. Clients log in to view their scans and 3D tours, download deliverables, and pay balances.
Staff use admin views to oversee jobs.

Booking, scheduling, dispatch, and payment collection run on **external systems** (Notion + n8n,
Acuity, Stripe, Matterport). This app is the portal/admin layer on top of them — it does not
replace them. See [`CLAUDE.md`](./CLAUDE.md) for the full standing brief and the non-negotiable
security rules.

## Stack

| Layer | Choice |
|---|---|
| Language | TypeScript |
| Framework | Next.js (App Router) |
| Host | Vercel (serverless) |
| Database | Supabase — managed Postgres with Row-Level Security **on** |
| Auth | Supabase Auth (managed; never hand-rolled) |
| Payments | Stripe (read-only in app; never touches raw card data) |

The application lives in [`/app`](./app). The build spec and data model live in [`/spec`](./spec).

## Security posture (read before contributing)

- **Row-level scoping is enforced server-side**, in the database, via Postgres RLS keyed off the
  authenticated Supabase JWT (`scans.client_email = auth.jwt() ->> 'email'`). Hiding rows in the
  browser is never acceptable.
- **Every access-control change ships with a cross-tenant isolation test** proving Client A cannot
  fetch Client B's rows *via the API/DB*.
- **No raw card data** in the app — Stripe holds the card; the app reads payment state only.
- **No secrets committed** — use the environment / secret store. See [`app/.env.example`](./app/.env.example).

## Getting started

```bash
cd app
npm install
cp .env.example .env.local   # fill in Supabase + Stripe values (never commit .env.local)
npm run dev
```

### Database / RLS

```bash
# Apply migrations to your Supabase project (or a local Postgres for tests)
# See app/supabase/migrations/
```

### Tests

```bash
cd app
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm test              # vitest (incl. the cross-tenant isolation test)
npm run test:e2e      # playwright
```

## Build sequence

This repo is built in strict order, one PR per step (see `CLAUDE.md`):

1. **Scaffold + rented stack** ← _this PR_
2. Schema + mirror read
3. Read-only client view
4. Charge-to-unlock
5. QA gate
6. Team + end-client scoping
7. Ops/admin views
