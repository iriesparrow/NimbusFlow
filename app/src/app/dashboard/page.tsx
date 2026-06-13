import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyScans } from "@/lib/scans";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already gates this, but never trust a single layer for auth.
  if (!user) redirect("/login");

  const scans = await getMyScans();

  return (
    <main>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Your scans</h1>
        <form action="/auth/signout" method="post">
          <button type="submit" style={{ background: "transparent", color: "var(--accent)" }}>
            Sign out
          </button>
        </form>
      </div>
      <p className="muted">Signed in as {user.email}</p>

      <div className="card" style={{ marginTop: "1.5rem" }}>
        {scans.length === 0 ? (
          <p className="muted">
            No scans yet. Your scans appear here once the system of record syncs them. (The mirror
            read lands in build-sequence step 2.)
          </p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
            {scans.map((s) => (
              <li key={s.id}>
                <strong>{s.address ?? "(address pending)"}</strong>
                {s.status ? ` — ${s.status}` : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="muted" style={{ marginTop: "1.5rem", fontSize: "0.85rem" }}>
        Rows shown are scoped to your account by the database (RLS), not by the browser.
      </p>
    </main>
  );
}
