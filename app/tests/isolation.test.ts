import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";

/**
 * CROSS-TENANT ISOLATION TEST (the non-negotiable for step 1).
 *
 * Proves, at the database boundary, that Client A's authenticated session cannot
 * read Client B's `scans` rows — i.e. isolation is enforced by RLS, not by the
 * UI or by app-code filtering. We run the PRODUCTION migration's RLS policy
 * unchanged against a throwaway Postgres, simulating Supabase's authenticated
 * request (SET ROLE authenticated + the request.jwt.claims GUC that auth.jwt()
 * reads).
 *
 * Requires TEST_DATABASE_URL (a disposable Postgres; CI provides one). If unset,
 * the suite fails loudly rather than silently passing — isolation must be proven.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION = join(__dirname, "..", "supabase", "migrations", "0001_init_scans_rls.sql");
const AUTH_SHIM = join(__dirname, "sql", "auth_shim.sql");

const DB_URL = process.env.TEST_DATABASE_URL;

const A = "a@firm-a.com";
const B = "b@firm-b.com";

describe("scans RLS cross-tenant isolation", () => {
  if (!DB_URL) {
    it("requires TEST_DATABASE_URL to prove isolation", () => {
      throw new Error(
        "TEST_DATABASE_URL is not set. The cross-tenant isolation test must run against a " +
          "real Postgres. Set TEST_DATABASE_URL to a disposable database (CI provides one).",
      );
    });
    return;
  }

  let admin: Client;

  beforeAll(async () => {
    admin = new Client({ connectionString: DB_URL });
    await admin.connect();

    // Clean slate, then build the schema exactly as production would, on top of
    // the test-only auth shim.
    await admin.query("drop table if exists public.scans cascade;");
    await admin.query(readFileSync(AUTH_SHIM, "utf8"));
    await admin.query(readFileSync(MIGRATION, "utf8"));

    // Service-role-equivalent insert (bypasses RLS as table owner) — stand-in for
    // n8n populating the mirror. Two tenants, one row each.
    await admin.query(
      "insert into public.scans (client_email, account, address, status) values ($1,$2,$3,$4),($5,$6,$7,$8)",
      [A, "Firm A", "1 A St", "scanned", B, "Firm B", "2 B Ave", "scanned"],
    );
  });

  afterAll(async () => {
    if (admin) {
      await admin.query("drop table if exists public.scans cascade;");
      await admin.end();
    }
  });

  /** Run a query as an authenticated client with the given email claim. */
  async function asClient(email: string, sql: string, params: unknown[] = []) {
    await admin.query("begin");
    try {
      await admin.query("set local role authenticated");
      // set_config so we can pass the JSON value as a bound parameter.
      await admin.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ email }),
      ]);
      const res = await admin.query(sql, params);
      return res.rows;
    } finally {
      await admin.query("rollback");
    }
  }

  it("a client sees only its own rows", async () => {
    const rows = await asClient(A, "select client_email from public.scans");
    expect(rows.map((r) => r.client_email)).toEqual([A]);
  });

  it("a client CANNOT fetch another client's row by direct lookup", async () => {
    const rows = await asClient(B, "select * from public.scans where client_email = $1", [A]);
    expect(rows).toHaveLength(0);
  });

  it("the unauthenticated/anon path is denied access entirely", async () => {
    // `anon` has no SELECT grant, so it's blocked at the privilege level before
    // RLS is even consulted — strictly stronger than returning zero rows.
    await admin.query("begin");
    try {
      await admin.query("set local role anon");
      await expect(admin.query("select * from public.scans")).rejects.toThrow(/permission denied/i);
    } finally {
      await admin.query("rollback");
    }
  });

  it("RLS is actually enabled and forced on the table", async () => {
    const { rows } = await admin.query(
      "select relrowsecurity, relforcerowsecurity from pg_class where oid = 'public.scans'::regclass",
    );
    expect(rows[0].relrowsecurity).toBe(true);
    expect(rows[0].relforcerowsecurity).toBe(true);
  });
});
