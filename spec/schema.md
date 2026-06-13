# DATUM — Data Model

> ⚠️ **PLACEHOLDER — not yet authoritative.**
>
> The full data model has not been committed yet. **Step 2 (Schema + mirror read) must not be built
> against this placeholder** — replace it with the real schema first.
>
> The scaffold (step 1) includes only a **minimal starter `scans` table** sufficient to prove the
> rented stack and the RLS isolation pattern end-to-end. It is intentionally not the full schema.
> See [`/app/supabase/migrations/`](../app/supabase/migrations/).

## Core entities (from CLAUDE.md)

`accounts`, `scans` (central), `deliverables`, `technicians`, `cameras`, `contacts`.

## The `scans` mirror row (read-only projection maintained by n8n)

| Column | Notes |
|---|---|
| `client_email` | **scoping key** ↔ authenticated `contact.email` |
| `account` | used for team views |
| `address` | |
| `zone` | |
| `goal` | |
| `status` | |
| `scheduled_slot` | from Acuity |
| `deposit` | |
| `balance` | |
| `pay_state` | from Stripe |
| `hosting` | Matterport |
| `tour_url` | Matterport embed |
| `deliverable_urls` | gated by pay + QA |
| `qa_result` | gate for deliverables |

## RLS contract (locked in step 1)

- RLS is **enabled** on `scans`.
- Read policy: a session may select a row only when `scans.client_email = auth.jwt() ->> 'email'`.
- The app uses the user-scoped (anon/JWT) Supabase client for all client-facing reads — **never** the
  service-role key, which bypasses RLS.
