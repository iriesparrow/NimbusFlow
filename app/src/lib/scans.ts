import { createClient } from "@/lib/supabase/server";

/**
 * Minimal starter shape of the `scans` mirror row. The full projection (see
 * /spec/schema.md) lands in build-sequence step 2; step 1 carries only enough
 * to prove the RLS-scoped read path end-to-end.
 */
export type ScanRow = {
  id: string;
  client_email: string;
  account: string | null;
  address: string | null;
  status: string | null;
};

/**
 * Reads the current user's scans.
 *
 * Returns ONLY the authenticated user's rows — not because we filter here, but
 * because the request runs as the authenticated user against a table with RLS
 * enabled (`scans.client_email = auth.jwt() ->> 'email'`). The `.eq()` below is
 * defense-in-depth/clarity; the database is the enforcement boundary.
 */
export async function getMyScans(): Promise<ScanRow[]> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return [];

  const { data, error } = await supabase
    .from("scans")
    .select("id, client_email, account, address, status")
    .eq("client_email", user.email)
    .order("address", { ascending: true });

  if (error) throw new Error(`Failed to read scans: ${error.message}`);
  return data ?? [];
}
