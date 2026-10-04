import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { dashboardPath, friendlyAuthError } from "@/lib/auth-rules";
import { fetchAccount } from "@/lib/account";
import { AuthCard, FormAlert } from "@/components/auth/AuthCard";

type Search = { reason?: "expired" | "reset" | undefined };

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    reason: s["reason"] === "expired" || s["reason"] === "reset" ? s["reason"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Log in — Sundance Professional AI" },
      { name: "description", content: "Log in to your Sundance Professional AI candidate or recruiter account." },
      { property: "og:title", content: "Log in to Sundance Professional AI" },
      { property: "og:description", content: "Access your Sundance Professional AI dashboard." },
    ],
  }),
  component: Login,
});

function Login() {
  const { reason } = Route.useSearch();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    setError(""); setInfo(""); setUnverifiedEmail("");
    if (!email || !password) return setError("Enter your email and password.");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      if (error.message.toLowerCase().includes("email not confirmed")) setUnverifiedEmail(email);
      return setError(friendlyAuthError(error.message));
    }
    const account = await fetchAccount();
    setLoading(false);
    if (!account) return setError("We couldn't load your account. Please try again.");
    if (account.status === "suspended") {
      await supabase.auth.signOut();
      return setError("This account has been suspended. Please contact support.");
    }
    navigate({ to: dashboardPath(account.role) });
  }

  async function resend() {
    const { error } = await supabase.auth.resend({ type: "signup", email: unverifiedEmail, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
    setInfo(error ? friendlyAuthError(error.message) : "Verification email sent. Check your inbox.");
  }

  return (
    <AuthCard>
      <h1 className="text-3xl font-extrabold">Welcome Back</h1>
      <p className="mt-2 text-sm text-muted-foreground">Log in to continue to Sundance Professional AI.</p>
      <form className="mt-8 space-y-5" noValidate onSubmit={submit}>
        {reason === "expired" && !error && <FormAlert>Your session has expired. Please log in again.</FormAlert>}
        {reason === "reset" && !error && <FormAlert kind="success">Password successfully updated. Log in with your new password.</FormAlert>}
        {error && (
          <FormAlert>
            {error}
            {unverifiedEmail && <> <button type="button" onClick={resend} className="font-semibold underline">Resend verification email</button></>}
          </FormAlert>
        )}
        {info && <FormAlert kind="success">{info}</FormAlert>}
        <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" /></div>
        <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" autoComplete="current-password" /></div>
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2"><Checkbox id="remember" defaultChecked /> Remember me</label>
          <Link to="/forgot-password" className="font-medium text-primary hover:underline">Forgot password?</Link>
        </div>
        <Button type="submit" size="lg" className="w-full rounded-full" disabled={loading}>{loading ? "Logging in…" : "Log In"}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Sundance Professional AI? <Link to="/register" className="font-medium text-primary hover:underline">Create Account</Link>
      </p>
    </AuthCard>
  );
}
