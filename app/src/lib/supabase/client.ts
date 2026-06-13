"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

/**
 * Browser Supabase client. Uses the public anon key, so every request carries
 * the user's JWT and is subject to RLS. There is intentionally no way to reach
 * the service-role key from the browser.
 */
export function createClient() {
  return createBrowserClient(publicEnv.supabaseUrl(), publicEnv.supabaseAnonKey());
}
