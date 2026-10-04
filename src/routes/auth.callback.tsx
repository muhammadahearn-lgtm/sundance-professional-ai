import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fetchAccount } from "@/lib/account";
import { dashboardPath, type Role } from "@/lib/auth-rules";
import { AuthCard, SuccessScreen } from "@/components/auth/AuthCard";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, 
      { title: "Email Verified — Sundance Professionals" },
      { name: "description", content: "Your Sundance Professionals email address is verified." },
      { property: "og:title", content: "Email verified" },
      { property: "og:description", content: "Your account is now active." },
    ],
  }),
  component: Callback,
});

function Callback() {
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "verified" | "failed">("checking");
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    if (window.location.hash.includes("error")) { setState("failed"); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return setState("failed");
      const acct = await fetchAccount();
      setRole(acct?.role ?? null);
      setState("verified");
    }, 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <AuthCard>
      {state === "checking" && <p className="text-center text-sm text-muted-foreground">Verifying your email…</p>}
      {state === "verified" && (
        <SuccessScreen title="Email Verified" actions={<Button className="rounded-full" onClick={() => navigate({ to: role ? dashboardPath(role) : "/login" })}>Continue</Button>}>
          Your account is active. Let's set up your profile.
        </SuccessScreen>
      )}
      {state === "failed" && (
        <div className="text-center">
          <h1 className="text-2xl font-extrabold">Link expired</h1>
          <p className="mt-2 text-sm text-muted-foreground">This verification link is invalid or has expired. Log in to request a new one.</p>
          <Button asChild className="mt-6 rounded-full"><Link to="/login">Go To Login</Link></Button>
        </div>
      )}
    </AuthCard>
  );
}
