import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-foreground">
      {children}
    </span>
  );
}

export function SectionHeading({ eyebrow, title, desc, center = true }: { eyebrow?: string; title: ReactNode; desc?: ReactNode; center?: boolean }) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="mt-4 text-3xl font-extrabold md:text-5xl">{title}</h2>
      {desc && <p className="mt-4 text-lg text-muted-foreground">{desc}</p>}
    </div>
  );
}

// Early access: every plan is free. Paid pricing will be set later.
export const plans = [
  {
    name: "Candidate", price: "Free", period: "for everyone", desc: "For technology professionals looking for their next role.",
    features: ["Skill-first talent profile", "Job search with match scores", "Save & compare jobs", "Application tracking", "Interviews hub with calendar links", "Career intelligence & analytics", "In-app messaging"],
    cta: "Join as Candidate", featured: false,
  },
  {
    name: "Recruiter", price: "Free", period: "during early access", desc: "For recruiters who want qualified technical talent, faster.",
    features: ["Company page & job wizard", "Talent search with match scores", "Save & compare candidates", "AI Top Pick", "Kanban hiring pipeline", "Interview scheduling", "Hiring analytics & messaging"],
    cta: "Join as Recruiter", featured: true,
  },
];

export function PricingCards() {
  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
      {plans.map((p) => (
        <div key={p.name} className={`relative flex flex-col rounded-3xl border p-8 ${p.featured ? "border-primary bg-ink text-ink-foreground shadow-elevated" : "border-border bg-card shadow-soft"}`}>
          {p.featured && <span className="absolute -top-3 left-8 rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Early access</span>}
          <h3 className="text-lg font-bold">{p.name}</h3>
          <p className={`mt-1 text-sm ${p.featured ? "text-ink-foreground/70" : "text-muted-foreground"}`}>{p.desc}</p>
          <div className="mt-6 flex items-baseline gap-2">
            <span className="font-display text-5xl font-extrabold">{p.price}</span>
            <span className={`text-sm ${p.featured ? "text-ink-foreground/70" : "text-muted-foreground"}`}>{p.period}</span>
          </div>
          <ul className="mt-8 flex-1 space-y-3">
            {p.features.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm">
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${p.featured ? "bg-primary" : "bg-primary-soft"}`}>
                  <Check className={`h-3 w-3 ${p.featured ? "text-primary-foreground" : "text-primary"}`} />
                </span>
                {f}
              </li>
            ))}
          </ul>
          <Button asChild size="lg" variant={p.featured ? "default" : "outline"} className="mt-8 rounded-full">
            <Link to="/register">{p.cta}</Link>
          </Button>
        </div>
      ))}
    </div>
  );
}

export function PageHero({ eyebrow, title, desc }: { eyebrow: string; title: ReactNode; desc: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-gradient-hero">
      <div className="container-x py-20 text-center md:py-28">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold md:text-6xl">{title}</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">{desc}</p>
      </div>
    </section>
  );
}
