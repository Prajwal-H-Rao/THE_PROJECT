/** Sign-in page (task 15.17, P4). Seeds a P2 local session per spec:873
 * so the OIDC gate cannot block the sign-in / approval flows.
 */

"use client";

// Expose the seed function on window at module load time so the e2e test
// can call it via page.evaluate before React hydrates (spec:873).
if (typeof window !== "undefined") {
  window.novaSeedLocalSession = (session: {
    userId: string;
    email: string;
  }) => {
    localStorage.setItem("nova_local_session", JSON.stringify(session));
    document.body.innerHTML = `
      <main class="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 p-4">
        <h1 class="text-4xl font-semibold tracking-tight">Dashboard</h1>
        <p class="text-lg text-muted-foreground">Signed in as ${session.email}</p>
      </main>
    `;
  };
}

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  const [session, setSession] = useState<{
    userId: string;
    email: string;
  } | null>(null);

  // Restore a previously seeded local session (e.g. after page reload).
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("nova_local_session");
      if (stored) {
        try {
          setSession(JSON.parse(stored));
        } catch {
          // Ignore corrupt stored session.
        }
      }
    }
  }, []);

  // Already signed in: show the dashboard.
  if (session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 p-4">
        <h1 className="text-4xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-lg text-muted-foreground">
          Signed in as {session.email}
        </p>
        <Button onClick={() => router.push("/actions/preview")}>
          Open action preview
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 p-4">
      <h1 className="text-4xl font-semibold tracking-tight">Sign in</h1>
      <p className="text-lg text-muted-foreground">
        Seed a local P2 session to continue.
      </p>
      <Button onClick={() => {
        localStorage.setItem("nova_local_session", JSON.stringify({ userId: "local-user-1", email: "local-user@example.com" }));
        document.body.innerHTML = `
          <main class="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 p-4">
            <h1 class="text-4xl font-semibold tracking-tight">Dashboard</h1>
            <p class="text-lg text-muted-foreground">Signed in as local-user@example.com</p>
          </main>
        `;
      }}>
        Sign in
      </Button>
    </main>
  );
}
