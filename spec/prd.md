# DATUM — Product Requirements (PRD)

> ⚠️ **PLACEHOLDER — not yet authoritative.**
>
> The consolidated build spec has not been committed to the repo yet. The scaffold (build-sequence
> step 1) does not depend on it, but **steps 2+ do**. The maintainer must replace this file with the
> real PRD before:
>
> - **Step 2 (Schema + mirror read)** — needs the full `scans` mirror contract maintained by n8n.
> - **Step 3 (Read-only client view)** — needs `/spec/mockups/dashboard-v2.html` to match.
>
> Until then, the only authoritative source is the summary inlined in [`/CLAUDE.md`](../CLAUDE.md).

## Known from CLAUDE.md (summary)

- **What:** client portal + ops-admin layer over external systems (Notion/n8n, Acuity, Stripe, Matterport).
- **Source of truth:** Notion (n8n is the sole writer). The app reads a flat `scans` mirror in our own DB.
- **Money:** Stripe; app reads state only, never handles raw card data.
- **Scoping key:** authenticated `contact.email` ↔ `scans.client_email` (and `account` for team views).

## Open items the real PRD must define

- The full field-by-field contract of the `scans` mirror and refresh cadence from n8n.
- The six ops/admin oversight reports (step 7).
- Charge-to-unlock rules (step 4) and the QA gate semantics (step 5).
- Team vs. end-client access rules (step 6).
