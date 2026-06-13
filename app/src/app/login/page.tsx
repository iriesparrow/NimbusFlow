import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link login via Supabase Auth (managed provider — auth is never
 * hand-rolled here). Clients sign in by email, which is also the row-scoping
 * key (`scans.client_email`).
 */
async function signIn(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  if (!email) redirect("/login?error=missing-email");

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/confirm`,
    },
  });

  redirect(error ? `/login?error=${encodeURIComponent(error.message)}` : "/login?sent=1");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { sent?: string; error?: string };
}) {
  // Already signed in? Go to the portal.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main>
      <h1>DATUM Client Portal</h1>
      <p className="muted">Sign in to view your scans, 3D tours, and deliverables.</p>

      <div className="card" style={{ marginTop: "1.5rem" }}>
        {searchParams.sent ? (
          <p>Check your email for a sign-in link.</p>
        ) : (
          <form action={signIn}>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required placeholder="you@firm.com" />
            <button type="submit" style={{ marginTop: "1rem" }}>
              Send sign-in link
            </button>
          </form>
        )}
        {searchParams.error ? (
          <p style={{ color: "#b00020", marginTop: "1rem" }}>{searchParams.error}</p>
        ) : null}
      </div>
    </main>
  );
}
