import Stripe from "stripe";
import { serverEnv } from "@/lib/env";

/**
 * Server-only Stripe client.
 *
 * This app READS payment state from Stripe. It never collects, stores, or
 * transmits raw card data — Stripe vaults the card and runs off-session charges
 * (wired in a later build-sequence step). Keep all usage server-side.
 */
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (!cached) {
    cached = new Stripe(serverEnv.stripeSecretKey(), {
      apiVersion: "2025-02-24.acacia",
      appInfo: { name: "datum-portal" },
    });
  }
  return cached;
}
