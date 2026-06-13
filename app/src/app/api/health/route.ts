import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { publicEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Read-only health check that the rented services are reachable and configured.
 * Performs only READ operations (Stripe account retrieve); never mutates state
 * and never touches card data. Useful as a deploy smoke test.
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // Supabase: confirm public config is present (no network call, no secrets leaked).
  try {
    publicEnv.supabaseUrl();
    publicEnv.supabaseAnonKey();
    checks.supabase = { ok: true };
  } catch (e) {
    checks.supabase = { ok: false, detail: (e as Error).message };
  }

  // Stripe: a read-only account fetch confirms the key works.
  try {
    const account = await getStripe().accounts.retrieve();
    checks.stripe = { ok: true, detail: account.id };
  } catch (e) {
    checks.stripe = { ok: false, detail: (e as Error).message };
  }

  const ok = Object.values(checks).every((c) => c.ok);
  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503 });
}
