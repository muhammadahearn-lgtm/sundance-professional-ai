import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Briefcase, Users, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create Account — Sundance Professional AI" },
      { name: "description", content: "Join Sundance Professional AI as a technology professional or recruiter." },
      { property: "og:title", content: "Join Sundance Professional AI" },
      { property: "og:description", content: "Create a candidate or recruiter account in minutes." },
    ],
  }),
  component: Register,
});

type Role = "candidate" | "recruiter";

function Register() {
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<Role>("candidate");
  const [error, setError] = useState("");

  return (
    <section className="bg-gradient-hero py-20">
      <div className="container-x">
        <div className="mx-auto max-w-lg rounded-3xl border border-border bg-card p-8 shadow-elevated">
          <div className="flex items-center gap-2 text-xs font-semibold">
            {[1, 2].map((s) => (
              <div key={s} className="flex flex-1 items-center gap-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{s}</span>
                <span className={step >= s ? "text-foreground" : "text-muted-foreground"}>{s === 1 ? "Choose user type" : "Create account"}</span>
              </div>
            ))}
          </div>

          {step === 1 ? (
            <>
              <h1 className="mt-8 text-3xl font-extrabold">How will you use Sundance Professional AI?</h1>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {([["candidate", Briefcase, "Candidate", "Find opportunities that match your skills."], ["recruiter", Users, "Recruiter", "Discover qualified technical talent."]] as const).map(([v, I, t, d]) => (
                  <button key={v} type="button" onClick={() => setRole(v)}
                    className={`relative rounded-2xl border-2 p-5 text-left transition ${role === v ? "border-primary bg-primary-soft" : "border-border hover:border-primary/40"}`}>
                    {role === v && <Check className="absolute right-4 top-4 h-4 w-4 text-primary" />}
                    <I className="h-6 w-6 text-primary" />
                    <div className="mt-3 font-bold">{t}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{d}</div>
                  </button>
                ))}
              </div>
              <Button size="lg" className="mt-8 w-full rounded-full" onClick={() => setStep(2)}>Continue</Button>
            </>
          ) : (
            <>
              <button onClick={() => setStep(1)} className="mt-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</button>
              <h1 className="mt-3 text-3xl font-extrabold">Create your {role} account</h1>
              <form className="mt-6 space-y-4" onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                setError(f.get("password") !== f.get("confirm") ? "Passwords do not match." : "");
              }}>
                <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" name="name" required /></div>
                <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required /></div>
                <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" minLength={8} required /></div>
                <div className="space-y-2"><Label htmlFor="confirm">Confirm Password</Label><Input id="confirm" name="confirm" type="password" minLength={8} required /></div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" size="lg" className="w-full rounded-full">Create account</Button>
              </form>
            </>
          )}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
