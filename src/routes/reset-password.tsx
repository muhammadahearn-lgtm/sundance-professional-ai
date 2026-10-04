import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { friendlyAuthError, validateNewPassword } from "@/lib/auth-rules";
import { AuthCard, FormAlert, SuccessScreen } from "@/components/auth/AuthCard";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, 
      { title: "Set New Password — Sundance Professionals" },
      { name: "description", content: "Choose a new password for your Sundance Professionals account." },
      { property: "og:title", content: "Set a new password" },
      { property: "og:description", content: "Update your Sundance Professionals password." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "ready" | "expired" | "done">("checking");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("error")) { setState("expired"); return; }
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setState((s) => (s === "checking" ? "ready" : s));
    });
    const t = setTimeout(async () => {
      const { data: s } = await supabase.auth.getSession();
      setState((cur) => (cur === "checking" ? (s.session ? "ready" : "expired") : cur));
    }, 1500);
    return () => { data.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password") ?? "");
    const msg = validateNewPassword(password, String(f.get("confirm") ?? ""));
    setError(msg ?? "");
    if (msg) return;
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return setError(friendlyAuthError(error.message));
    setState("done");
    await supabase.auth.signOut();
  }

  return (
    <AuthCard>
      {state === "checking" && <p className="text-center text-sm text-muted-foreground">Verifying your reset link…</p>}
      {state === "expired" && (
        <div className="text-center">
          <h1 className="text-2xl font-extrabold">Link expired</h1>
          <p className="mt-2 text-sm text-muted-foreground">This password reset link is invalid or has expired. Please request a new one.</p>
          <Button asChild className="mt-6 rounded-full"><Link to="/forgot-password">Request new link</Link></Button>
        </div>
      )}
      {state === "done" && (
        <SuccessScreen title="Password updated" actions={<Button className="rounded-full" onClick={() => navigate({ to: "/login", search: { reason: "reset" } })}>Go To Login</Button>}>
          Password successfully updated.
        </SuccessScreen>
      )}
      {state === "ready" && (
        <>
          <h1 className="text-3xl font-extrabold">Set a new password</h1>
          <form className="mt-8 space-y-5" noValidate onSubmit={submit}>
            {error && <FormAlert>{error}</FormAlert>}
            <div className="space-y-2"><Label htmlFor="password">New Password</Label><PasswordInput id="password" name="password" autoComplete="new-password" /></div>
            <div className="space-y-2"><Label htmlFor="confirm">Confirm New Password</Label><PasswordInput id="confirm" name="confirm" autoComplete="new-password" /></div>
            <Button type="submit" size="lg" className="w-full rounded-full" disabled={loading}>{loading ? "Updating…" : "Update Password"}</Button>
          </form>
        </>
      )}
    </AuthCard>
  );
}
