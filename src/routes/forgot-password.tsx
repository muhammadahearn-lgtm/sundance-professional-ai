import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { friendlyAuthError } from "@/lib/auth-rules";
import { AuthCard, FormAlert, SuccessScreen } from "@/components/auth/AuthCard";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — Sundance Professional AI" },
      { name: "description", content: "Request a password reset link for your Sundance Professional AI account." },
      { property: "og:title", content: "Reset your Sundance Professional AI password" },
      { property: "og:description", content: "Get a secure link to reset your password." },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Enter a valid email address.");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setLoading(false);
    if (error) return setError(friendlyAuthError(error.message));
    setSent(true);
  }

  return (
    <AuthCard>
      {sent ? (
        <SuccessScreen title="Check your email" actions={<Button asChild className="rounded-full"><Link to="/login">Back to Login</Link></Button>}>
          Password reset instructions have been sent to your email.
        </SuccessScreen>
      ) : (
        <>
          <h1 className="text-3xl font-extrabold">Reset Password</h1>
          <p className="mt-2 text-sm text-muted-foreground">Enter your email and we'll send you a link to reset your password.</p>
          <form className="mt-8 space-y-5" noValidate onSubmit={submit}>
            {error && <FormAlert>{error}</FormAlert>}
            <div className="space-y-2"><Label htmlFor="email">Email Address</Label><Input id="email" name="email" type="email" autoComplete="email" /></div>
            <Button type="submit" size="lg" className="w-full rounded-full" disabled={loading}>{loading ? "Sending…" : "Send Reset Link"}</Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground"><Link to="/login" className="font-medium text-primary hover:underline">Back to login</Link></p>
        </>
      )}
    </AuthCard>
  );
}
