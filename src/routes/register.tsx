import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Briefcase, Users, ArrowLeft, Check, Mail, Camera } from "lucide-react";
import { savePendingAvatar, toSquareDataUrl, validateAvatar } from "@/lib/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { friendlyAuthError, validateRegistration, type Role } from "@/lib/auth-rules";
import { AuthCard, FieldError, FormAlert } from "@/components/auth/AuthCard";
import { PasswordInput } from "@/components/auth/PasswordInput";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, 
      { title: "Create Account — Sundance Professionals" },
      { name: "description", content: "Join Sundance Professionals as a technology professional or recruiter." },
      { property: "og:title", content: "Join Sundance Professionals" },
      { property: "og:description", content: "Create a candidate or recruiter account in minutes." },
    ],
  }),
  component: Register,
});

const CARDS = [
  { v: "candidate" as const, Icon: Briefcase, title: "Candidate", lines: ["Discover jobs.", "Understand career readiness.", "Receive AI-powered recommendations.", "Track applications."], cta: "Continue as Candidate" },
  { v: "recruiter" as const, Icon: Users, title: "Recruiter", lines: ["Discover talent.", "Create jobs.", "Build hiring pipelines.", "Hire faster."], cta: "Continue as Recruiter" },
];

function Register() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [role, setRole] = useState<Role>("candidate");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [email, setEmail] = useState("");
  const [resendMsg, setResendMsg] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoErr, setPhotoErr] = useState("");

  async function pickPhoto(file: File | undefined) {
    setPhotoErr("");
    if (!file) return;
    const err = validateAvatar(file);
    if (err) return setPhotoErr(err);
    try { setPhoto(await toSquareDataUrl(file)); } catch { setPhotoErr("Couldn't read that image."); }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const input = {
      firstName: String(f.get("firstName") ?? ""),
      lastName: String(f.get("lastName") ?? ""),
      email: String(f.get("email") ?? ""),
      password: String(f.get("password") ?? ""),
      confirm: String(f.get("confirm") ?? ""),
      agreed,
    };
    const errs = validateRegistration(input);
    setErrors(errs as Record<string, string>);
    setFormError("");
    if (Object.keys(errs).length) return;
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { role, first_name: input.firstName.trim(), last_name: input.lastName.trim() },
      },
    });
    setLoading(false);
    if (error) return setFormError(friendlyAuthError(error.message));
    // Existing confirmed emails come back with no identities
    if (data.user && data.user.identities?.length === 0) return setFormError(friendlyAuthError("already registered"));
    savePendingAvatar(photo);
    setEmail(input.email.trim());
    setStep(3);
  }

  async function resend() {
    setResendMsg("");
    const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
    setResendMsg(error ? friendlyAuthError(error.message) : "Verification email sent again.");
  }

  return (
    <AuthCard wide={step === 1}>
      <div className="flex items-center gap-2 text-xs font-semibold">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{s}</span>
            <span className={`hidden sm:inline ${step >= s ? "text-foreground" : "text-muted-foreground"}`}>{s === 1 ? "Account type" : s === 2 ? "Create account" : "Verify email"}</span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <>
          <h1 className="mt-8 text-2xl font-extrabold sm:text-3xl">Choose your account type</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your account type can't be changed later.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {CARDS.map(({ v, Icon, title, lines, cta }) => (
              <div key={v} className={`relative flex flex-col rounded-2xl border-2 p-6 transition ${role === v ? "border-primary bg-primary-soft" : "border-border"}`}>
                {role === v && <Check className="absolute right-4 top-4 h-4 w-4 text-primary" />}
                <Icon className="h-7 w-7 text-primary" />
                <div className="mt-3 text-lg font-bold">{title}</div>
                <ul className="mt-2 flex-1 space-y-1 text-sm text-muted-foreground">
                  {lines.map((l) => <li key={l}>{l}</li>)}
                </ul>
                <Button className="mt-5 w-full rounded-full" variant={role === v ? "default" : "outline"} onClick={() => { setRole(v); setStep(2); }}>{cta}</Button>
              </div>
            ))}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h1 className="mt-8 text-2xl font-extrabold sm:text-3xl">Create your {role} account</h1>
          <form className="mt-6 space-y-4" noValidate onSubmit={submit}>
            {formError && <FormAlert>{formError}{formError.includes("already exists") && <> <Link to="/login" className="font-semibold underline">Log in</Link></>}</FormAlert>}
            <div className="flex items-center gap-4">
              <label className="group relative grid h-20 w-20 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border-2 border-dashed border-border bg-muted text-muted-foreground hover:border-primary hover:text-primary">
                {photo ? <img src={photo} alt="Your photo" className="h-full w-full object-cover" /> : <Camera className="h-6 w-6" />}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Profile photo (optional)" onChange={(e) => pickPhoto(e.target.files?.[0])} />
              </label>
              <div className="text-sm">
                <div className="font-semibold">Profile Photo <span className="font-normal text-muted-foreground">(optional)</span></div>
                <p className="text-muted-foreground">JPG, PNG or WebP, up to 5 MB. You can add or change it later.</p>
                {photo && <button type="button" className="mt-1 text-xs font-semibold text-primary hover:underline" onClick={() => setPhoto(null)}>Remove</button>}
                <FieldError msg={photoErr} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="firstName">First Name</Label><Input id="firstName" name="firstName" autoComplete="given-name" /><FieldError msg={errors["firstName"]} /></div>
              <div className="space-y-2"><Label htmlFor="lastName">Last Name</Label><Input id="lastName" name="lastName" autoComplete="family-name" /><FieldError msg={errors["lastName"]} /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="email">Email Address</Label><Input id="email" name="email" type="email" autoComplete="email" /><FieldError msg={errors["email"]} /></div>
            <div className="space-y-2"><Label htmlFor="password">Password</Label><PasswordInput id="password" name="password" autoComplete="new-password" /><FieldError msg={errors["password"]} /></div>
            <div className="space-y-2"><Label htmlFor="confirm">Confirm Password</Label><PasswordInput id="confirm" name="confirm" autoComplete="new-password" /><FieldError msg={errors["confirm"]} /></div>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
              <span>I agree to the <Link to="/terms" target="_blank" className="font-medium text-primary underline-offset-2 hover:underline">Terms of Service</Link>, <Link to="/privacy" target="_blank" className="font-medium text-primary underline-offset-2 hover:underline">Privacy Policy</Link> and <Link to="/community-guidelines" target="_blank" className="font-medium text-primary underline-offset-2 hover:underline">Community Guidelines</Link></span>
            </label>
            <FieldError msg={errors["agreed"]} />
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" size="lg" className="rounded-full" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4" /> Back</Button>
              <Button type="submit" size="lg" className="flex-1 rounded-full" disabled={loading}>{loading ? "Creating account…" : "Create Account"}</Button>
            </div>
          </form>
        </>
      )}

      {step === 3 && (
        <div className="mt-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary"><Mail className="h-7 w-7" /></span>
          <h1 className="mt-5 text-2xl font-extrabold sm:text-3xl">Verify Your Email</h1>
          <p className="mt-2 text-sm text-muted-foreground">Check your inbox and click the verification link to activate your Sundance Professionals account.</p>
          <p className="mt-1 text-sm font-medium">{email}</p>
          {resendMsg && <div className="mt-4 text-left"><FormAlert kind={resendMsg.startsWith("Verification") ? "success" : "error"}>{resendMsg}</FormAlert></div>}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild className="rounded-full"><Link to="/login">Go To Login</Link></Button>
            <Button variant="outline" className="rounded-full" onClick={resend}>Resend Verification Email</Button>
          </div>
        </div>
      )}

      {step !== 3 && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Log in</Link>
        </p>
      )}
    </AuthCard>
  );
}
