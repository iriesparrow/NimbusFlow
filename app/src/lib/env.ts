/**
 * Centralized, validated environment access.
 *
 * Fail fast with a clear message if a required variable is missing, rather than
 * surfacing a cryptic error deep inside the Supabase/Stripe clients. Secrets are
 * read here only; nothing in this file is logged.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `See app/.env.example and set it in .env.local (or the Vercel/Supabase secret store).`,
    );
  }
  return value;
}

/** Public Supabase config — safe to ship to the browser. */
export const publicEnv = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
};

/**
 * Server-only secrets. Accessed lazily via functions so that importing this
 * module from a client component does not throw — only calling a server getter
 * on the server does.
 */
export const serverEnv = {
  /** SERVICE ROLE BYPASSES RLS — trusted server jobs only, never client reads. */
  supabaseServiceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  stripeSecretKey: () => required("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: () => process.env.STRIPE_WEBHOOK_SECRET ?? "",
};
