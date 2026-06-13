# DATUM — Project Instructions (CLAUDE.md)

> This file is the agent's standing brief. Read it before every task. It encodes the
> architecture, the hard security rules, the build order, and the things you must never do.
> When a decision or behavior changes, update this file and `/spec` in the same PR.

-----

## What we're building

A **client portal + operations-admin web app** for DATUM, an architect-run 3D interior-scanning
service in New York. Clients (architecture firms, real-estate agents, individual owners) log in to
see their scans, view 3D tours, download deliverables, and pay balances. Staff use admin views to
run and oversee jobs.

Booking, scheduling, dispatch, and payment collection **already run on external systems**. This app
is the **membership/portal + admin layer** on top of them. It does not replace them.

-----

## Source of truth & data flow — read this first

- **Notion is the system of record. `n8n` is the ONLY writer to Notion. This app must NEVER write to Notion.**
- The app reads a flat projection — the **`scans` mirror** — kept in sync by n8n in *our own* database.
  Read from the mirror; never invent, duplicate, or write business data back to Notion.
- **Money lives in Stripe.** The app *reads* payment state. It **never handles raw card data.**
- **Scheduling lives in Acuity.** Do not rebuild scheduling or availability.
- **Matterport is a capture/hosting appliance.** Read scan status, embed the tour, read asset URLs.
  Do **not** assume a Space-transfer API exists without confirming it.

-----

## Stack — rent the hard parts

Confirmed (issue #1):

- Language: **TypeScript**
- Framework: **Next.js (App Router)**
- Database: **Supabase — managed Postgres with Row-Level Security enabled**
- Auth: **Supabase Auth** (managed provider). **Never hand-roll authentication.**
- Payments: **Stripe** (Stripe vaults the card and runs off-session charges; the app reads state only).
- Host: **Vercel** (serverless)

Rationale: the security-critical pieces (identity, data isolation, money) are rented from specialists.
We own only the glue and the UI. Auth and RLS share one identity layer (the Supabase JWT), so
row-level scoping is enforced in the database off the authenticated identity.

-----

## Non-negotiable security rules

This app handles **interior photography of private homes**, governed by the **NY SHIELD Act**.
Treat data isolation as a security requirement, never a UI preference.

1. **Row-level scoping is enforced server-side.** A client's session must never be able to retrieve
   another client's rows. Scope by authenticated **contact email / account**. Hiding rows in the
   browser is NOT acceptable.
1. **Every access-control change ships with a test proving cross-tenant isolation** — i.e., Client A
   cannot fetch Client B's scan *via the API*, not just via the UI.
1. **Never handle raw card data.** Stripe holds the card; the app reads state.
1. **Never commit secrets.** Use the environment / secret store.
1. **Never weaken RLS or auth to make a feature easier.** Escalate to the maintainer instead.

-----

## Data model (summary — full schema in `/spec/schema.md`)

Core entities: `accounts`, `scans` (central), `deliverables`, `technicians`, `cameras`, `contacts`.

The mirror `scans` row the app reads:
`client_email` (scoping key) · `account` · `address` · `zone` · `goal` · `status` ·
`scheduled_slot` · `deposit` · `balance` · `pay_state` · `hosting` · `tour_url` ·
`deliverable_urls` · `qa_result`.

Scoping key: authenticated `contact.email` ↔ `scans.client_email` (and `account` for team views).

-----

## Build sequence — work in this order, one PR per step

1. **Scaffold + rented stack** — auth, managed Postgres (RLS on), host, Stripe wired.
1. **Schema + mirror read** — read the n8n-maintained `scans` projection.
1. **Read-only client view** — account-scoped scan library + tour embed.
1. **Charge-to-unlock** — Stripe off-session charge; unlock deliverables on `paid`.
1. **QA gate** — withhold deliverables until `qa_result = pass`.
1. **Team + end-client scoping** — row-level access by email / account.
1. **Ops/admin views** — internal dashboard + the six oversight reports.

**Slow down and add extra review on steps 1, 4, and 6** (auth, payments, scoping). Do not build ahead
of the sequence.

-----

## Workflow rules

- **One feature per branch; small, reviewable PRs** with a clear description of the change.
- **Match the mockups** in `/spec/mockups` — `dashboard-v2.html` is the front-end reference.
- **Write tests.** For any access-control code, a passing **isolation test is required to merge**.
- **Ask before** adding a new dependency, service, or external API.
- **Update `/spec` and this file** when behavior or a decision changes.
- **Definition of done:** tests pass · isolation verified where relevant · matches spec/mockup ·
  no secrets · PR description explains the change.

-----

## Do not

- Do **not** write to Notion (n8n is the sole writer).
- Do **not** handle raw card data (Stripe only).
- Do **not** rebuild scheduling (Acuity) or invent a Matterport transfer API.
- Do **not** hand-roll auth or rely on client-side row hiding for isolation.
- Do **not** invent business data — read the mirror.
- Do **not** add dependencies or services silently.

-----

## Repo map

```
/spec/prd.md         the consolidated build spec
/spec/schema.md      the full data model
/spec/mockups/       HTML design references (dashboard-v2.html, etc.)
/app                 the application
.github/workflows    @claude automation + PR review
```

-----

## How to start

First task: read all of `/spec`, then **propose the concrete stack choices and a scaffold plan as an
issue and wait for approval** before writing code. Once approved, implement build-sequence step 1 as a
single PR. Follow the security rules above without exception.
