import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Server-side Supabase client bound to the request's auth cookies.
 *
 * IMPORTANT: this uses the ANON key, not the service-role key. All reads through
 * this client run as the authenticated user and are therefore subject to RLS —
 * that is the whole point. Server-side row scoping is enforced by Postgres, not
 * by us filtering in app code.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(publicEnv.supabaseUrl(), publicEnv.supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // `setAll` is called from Server Components where mutating cookies is
          // not allowed; the middleware refreshes the session instead. Safe to ignore.
        }
      },
    },
  });
}
