import { Link } from "@tanstack/react-router";
import { ArrowRight, Crown, GitCompareArrows, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/site/shared";

// Static illustrative mockup of side-by-side comparison. Sample data only; no scoring logic exposed.

type Person = { i: string; name: string; role: string; score: number; years: string; salary: string; skills: string; tools: string; wins: string[]; top?: boolean };

const PEOPLE: Person[] = [
  { i: "MC", name: "Maya Chen", role: "ML Engineer", score: 94, years: "6 yrs", salary: "$165k", skills: "9 of 10", tools: "7 of 8", wins: ["Best Skills Fit", "Most Experience"], top: true },
  { i: "DB", name: "Daniel Brooks", role: "Data Scientist", score: 88, years: "4 yrs", salary: "$140k", skills: "8 of 10", tools: "6 of 8", wins: ["Best Salary Fit"] },
  { i: "AK", name: "Aisha Khan", role: "AI Engineer", score: 83, years: "5 yrs", salary: "$155k", skills: "7 of 10", tools: "8 of 8", wins: ["Best Tools Fit"] },
];

const ROWS: [string, keyof Person][] = [["Experience", "years"], ["Expected salary", "salary"], ["Required skills", "skills"], ["Tools & technologies", "tools"]];

export function CompareShowcase() {
  return (
    <section className="relative overflow-hidden py-24">
      <div className="pointer-events-none absolute inset-0 bg-gradient-hero opacity-50" />
      <div className="container-x relative">
        <SectionHeading
          eyebrow="Side-by-side comparison"
          title={<>Stop juggling 10 browser tabs. <span className="text-gradient">Compare side by side.</span></>}
          desc="Line up to four candidates or jobs in one view. Category winners are highlighted and an AI Top Pick explains which one fits best — for recruiters and candidates alike."
        />
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {PEOPLE.map((p) => (
            <div key={p.name} className={`relative rounded-3xl border bg-card p-6 transition hover:-translate-y-1 hover:shadow-elevated ${p.top ? "border-primary/40 shadow-elevated" : "border-border shadow-soft"}`}>
              {p.top && (
                <span className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-soft">
                  <Crown className="h-3.5 w-3.5" /> AI Top Pick
                </span>
              )}
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft font-display font-bold text-primary">{p.i}</span>
                <div className="min-w-0 flex-1"><div className="font-bold">{p.name}</div><div className="text-xs text-muted-foreground">{p.role}</div></div>
                <div className="text-right"><div className="font-display text-2xl font-extrabold text-primary">{p.score}%</div><div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Match</div></div>
              </div>
              <dl className="mt-5 divide-y divide-border rounded-xl border border-border">
                {ROWS.map(([l, k]) => (
                  <div key={l} className="flex justify-between px-3 py-2 text-sm"><dt className="text-muted-foreground">{l}</dt><dd className="font-semibold">{String(p[k])}</dd></div>
                ))}
              </dl>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {p.wins.map((w) => <span key={w} className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary"><Trophy className="h-3 w-3" />{w}</span>)}
              </div>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-8 flex max-w-3xl items-start gap-3 rounded-2xl border border-primary/30 bg-card p-5 shadow-soft">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></span>
          <p className="text-sm"><b>AI Top Pick: Maya Chen.</b> <span className="text-muted-foreground">Strongest coverage of the role's required skills and the most hands-on experience, within the role's salary range.</span></p>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="rounded-full px-6"><Link to="/register">Try Comparison Free <ArrowRight /></Link></Button>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><GitCompareArrows className="h-3.5 w-3.5" />Sample data shown for illustration</span>
        </div>
      </div>
    </section>
  );
}
