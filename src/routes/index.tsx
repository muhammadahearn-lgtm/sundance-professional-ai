import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import {
  ArrowRight, ArrowDown, Target, Brain, LineChart, Search, Gauge, Sparkles,
  Check, Quote, ChartColumn, ListChecks, Eye, GitCompareArrows, Layers, CalendarCheck, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow, SectionHeading, PricingCards } from "@/components/site/shared";
import hero from "@/assets/hero.jpg";

const TITLE = "Sundance AI — AI Hiring Platform for Skill-Based Technology Recruiting";
const DESC = "AI hiring platform for technology recruiting: skill-based hiring, candidate discovery, career intelligence and a recruiter marketplace in one place.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: "AI Hiring Platform, Technology Recruiting, Career Intelligence, Skill-Based Hiring, Candidate Discovery, Recruiter Marketplace" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <Hero />
      <Solution />
      <SkillFirst />
      <AudienceSplit />
      <Intelligence />
      <ProductPreview />

      <Testimonials />
      <section className="py-24">
        <div className="container-x">
          <SectionHeading eyebrow="Pricing" title="Simple, transparent pricing" desc="Free for candidates. Powerful for recruiters." />
          <div className="mt-14"><PricingCards /></div>
        </div>
      </section>
      <FinalCta />
    </>
  );
}

function Hero() {
  const stats = [["10,000+", "Talent Professionals"], ["1,000+", "Recruiters"], ["500+", "Companies"], ["95%", "Match Accuracy"]];
  return (
    <section className="relative overflow-hidden bg-gradient-hero">
      <div className="container-x grid items-center gap-12 pb-16 pt-14 md:pt-20 lg:grid-cols-2">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Eyebrow><Sparkles className="h-3.5 w-3.5" /> Skill-first hiring, powered by AI</Eyebrow>
          <h1 className="mt-6 text-5xl font-extrabold leading-[1.05] md:text-6xl xl:text-7xl">
            Find the Right Opportunity.<br /><span className="text-gradient">Hire the Right Talent.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Sundance AI uses AI-powered candidate discovery, skill-first matching, career intelligence, and recruiting intelligence to help technology professionals and recruiters make better hiring decisions.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full px-6 shadow-elevated"><Link to="/register">Get Started <ArrowRight /></Link></Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-6"><Link to="/register">Explore Opportunities</Link></Button>
            <Button asChild size="lg" variant="ghost" className="rounded-full px-4 text-primary"><Link to="/pricing">For Recruiters <ArrowRight /></Link></Button>
          </div>
        </div>
        <div className="relative animate-in fade-in zoom-in-95 duration-1000">
          <img src={hero} alt="AI matching technology professionals with recruiters" width={1280} height={1024} className="w-full mix-blend-multiply" />
        </div>
      </div>
      <div className="container-x pb-20">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-soft md:grid-cols-4">
          {stats.map(([v, l]) => (
            <div key={l} className="bg-card p-6 text-center">
              <div className="font-display text-3xl font-extrabold md:text-4xl">{v}</div>
              <div className="mt-1 text-sm text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


function Solution() {
  const feats = [
    [Target, "Skill-First Matching", "Match on what people can do, not just what's on paper."],
    [Search, "Candidate Discovery", "Surface qualified technical talent instantly."],
    [Brain, "Career Intelligence", "Personalized guidance on skills, roles and growth."],
    [LineChart, "Recruiting Intelligence", "Rank, compare and pipeline candidates with data."],
    [Sparkles, "Transparent Match Scores", "Every score explains exactly why it matches."],
    [Gauge, "Career Readiness Scoring", "Know how ready you are for your next role."],
  ] as const;
  return (
    <section className="py-24">
      <div className="container-x">
        <SectionHeading eyebrow="The solution" title={<>Meet <span className="text-gradient">Sundance AI</span></>} desc="An intelligent hiring marketplace built specifically for technology professionals and recruiters." />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {feats.map(([I, t, d]) => (
            <div key={t} className="group rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:shadow-elevated">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground"><I className="h-5 w-5" /></span>
              <h3 className="mt-5 text-lg font-bold">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SkillFirst() {
  const focus = ["Technical Skills", "Programming Languages", "Technologies", "Relevant Experience", "Career Readiness", "Match Intelligence"];
  const Flow = ({ title, steps, good }: { title: string; steps: string[]; good?: boolean }) => (
    <div className={`rounded-3xl border p-8 ${good ? "border-primary/30 bg-card shadow-elevated" : "border-border bg-muted"}`}>
      <div className={`text-sm font-semibold ${good ? "text-primary" : "text-muted-foreground"}`}>{title}</div>
      <div className="mt-6 flex flex-col items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex w-full flex-col items-center gap-2">
            <div className={`w-full rounded-xl px-4 py-3 text-center text-sm font-semibold ${good ? "bg-gradient-primary text-primary-foreground" : "border border-border bg-background text-muted-foreground"}`}>{s}</div>
            {i < steps.length - 1 && <ArrowDown className={`h-4 w-4 ${good ? "text-primary" : "text-muted-foreground"}`} />}
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <section className="py-24">
      <div className="container-x grid items-center gap-14 lg:grid-cols-2">
        <div>
          <SectionHeading center={false} eyebrow="Skill-first hiring" title="Beyond Resumes. Beyond Keywords." desc="Traditional platforms focus on resumes and keywords. Sundance AI focuses on:" />
          <div className="mt-8 grid grid-cols-2 gap-3">
            {focus.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm font-medium"><Check className="h-4 w-4 text-primary" /> {f}</div>
            ))}
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Flow title="Traditional Hiring" steps={["Resume", "Keyword Search", "Manual Screening", "Interview"]} />
          <Flow good title="Sundance AI" steps={["Talent Profile", "AI Matching", "Candidate Discovery", "Hire"]} />
        </div>
      </div>
    </section>
  );
}

const PREVIEW_TABS = [
  { id: "candidate", label: "Candidate Dashboard", path: "app.sundance.ai / dashboard" },
  { id: "recruiter", label: "Recruiter Dashboard", path: "app.sundance.ai / recruiter" },
  { id: "profile", label: "Candidate Profile", path: "app.sundance.ai / profile" },
  { id: "jobs", label: "Job Search", path: "app.sundance.ai / job-search" },
  { id: "talent", label: "Talent Search", path: "app.sundance.ai / talent-search" },
] as const;
type PreviewTabId = (typeof PREVIEW_TABS)[number]["id"];

function MatchBadge({ score }: { score: number }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${score >= 90 ? "bg-success/15 text-success" : "bg-primary-soft text-primary"}`}>{score}% match</span>;
}

function PersonRow({ initials, name, sub, score }: { initials: string; name: string; sub: string; score: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft font-display text-sm font-bold text-primary">{initials}</span>
        <div><div className="text-sm font-semibold">{name}</div><div className="text-xs text-muted-foreground">{sub}</div></div>
      </div>
      <MatchBadge score={score} />
    </div>
  );
}

function StatTile({ n, l }: { n: number; l: string }) {
  return (
    <div className="rounded-lg bg-primary-soft p-3 text-center"><div className="font-display text-xl font-bold text-primary">{n}</div><div className="text-xs text-muted-foreground">{l}</div></div>
  );
}

function ProductPreview() {
  const [tab, setTab] = useState<PreviewTabId>("talent");
  const active = PREVIEW_TABS.find((t) => t.id === tab)!;
  return (
    <section className="py-24">
      <div className="container-x">
        <SectionHeading eyebrow="Product preview" title="See Sundance AI in Action" desc="Explore the experience for candidates and recruiters." />
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          {PREVIEW_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition ${tab === t.id ? "border-primary bg-primary text-primary-foreground shadow-elevated" : "border-border bg-card text-foreground hover:border-primary/40"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="mt-10 overflow-hidden rounded-3xl border border-border bg-card shadow-elevated">
          <div className="flex items-center gap-2 border-b border-border bg-secondary px-5 py-3">
            <span className="h-3 w-3 rounded-full bg-destructive/70" />
            <span className="h-3 w-3 rounded-full bg-chart-4" />
            <span className="h-3 w-3 rounded-full bg-success/80" />
            <span className="ml-4 text-xs text-muted-foreground">{active.path}</span>
          </div>
          <div className="bg-secondary/60 p-5 sm:p-8 lg:p-10">
            <div className="mx-auto max-w-5xl rounded-2xl border border-border bg-card p-5 sm:p-7">
              {tab === "talent" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Senior React engineers with 5+ years...</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["5+ years", "US-based", "Open to work", "TypeScript"].map((c, i) => (
                      <span key={c} className={`rounded-full px-3 py-1 text-xs font-medium ${i < 3 ? "bg-primary-soft text-primary" : "border border-border text-muted-foreground"}`}>{c}</span>
                    ))}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <PersonRow initials="PR" name="Priya Raman" sub="Senior React Engineer · 7 yrs" score={97} />
                    <PersonRow initials="ML" name="Marcus Lee" sub="Full-Stack Engineer · 5 yrs" score={92} />
                    <PersonRow initials="ET" name="Elena Torres" sub="Frontend Lead · 9 yrs" score={89} />
                    <PersonRow initials="DO" name="David Okafor" sub="TypeScript Engineer · 4 yrs" score={84} />
                  </div>
                </div>
              )}
              {tab === "candidate" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border p-4">
                    <Bar label="Career Readiness" v={89} />
                  </div>
                  <div className="space-y-3">
                    <PersonRow initials="S" name="Senior ML Engineer" sub="Northwind AI" score={96} />
                    <PersonRow initials="D" name="Data Engineer" sub="Lumen Cloud" score={91} />
                    <PersonRow initials="A" name="AI Platform Engineer" sub="Vertex Labs" score={88} />
                  </div>
                </div>
              )}
              {tab === "recruiter" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    <StatTile n={48} l="Sourced" />
                    <StatTile n={21} l="Screen" />
                    <StatTile n={9} l="Interview" />
                    <StatTile n={3} l="Offer" />
                  </div>
                  <div className="space-y-3">
                    <PersonRow initials="P" name="Priya Sharma" sub="Full-Stack · React, AWS" score={96} />
                    <PersonRow initials="D" name="Daniel Kim" sub="ML · Python, PyTorch" score={92} />
                    <PersonRow initials="M" name="Marcus Lee" sub="DevOps · Kubernetes" score={88} />
                  </div>
                </div>
              )}
              {tab === "profile" && (
                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft font-display text-lg font-bold text-primary">AC</span>
                    <div>
                      <div className="font-display text-lg font-bold">Alex Chen</div>
                      <div className="text-sm text-muted-foreground">Full-Stack Engineer · 6 yrs</div>
                    </div>
                    <div className="ml-auto hidden sm:block"><MatchBadge score={89} /></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["React", "TypeScript", "Node.js", "PostgreSQL", "AWS"].map((s) => (
                      <span key={s} className="rounded-md bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">{s}</span>
                    ))}
                    <span className="rounded-md border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground">Missing: Kubernetes</span>
                  </div>
                  <Bar label="Career Readiness" v={89} />
                </div>
              )}
              {tab === "jobs" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Machine learning roles near San Francisco...</span>
                  </div>
                  <div className="space-y-3">
                    <PersonRow initials="N" name="Senior ML Engineer" sub="Northwind AI · Remote" score={96} />
                    <PersonRow initials="L" name="Data Engineer" sub="Lumen Cloud · San Francisco" score={91} />
                    <PersonRow initials="V" name="AI Platform Engineer" sub="Vertex Labs · Hybrid" score={88} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AudienceSplit() {
  const candidate = [
    { I: Brain, label: "AI-Powered Job Matching" },
    { I: Gauge, label: "Career Readiness Scoring" },
    { I: ChartColumn, label: "Skill Gap Analysis" },
    { I: Sparkles, label: "Personalized Recommendations" },
    { I: ListChecks, label: "Application Tracking" },
    { I: Eye, label: "Recruiter Visibility" },
  ];
  const recruiter = [
    { I: Brain, label: "AI-Powered Candidate Matching" },
    { I: Search, label: "Talent Search" },
    { I: GitCompareArrows, label: "Candidate Comparison" },
    { I: Layers, label: "Recruiting Pipeline" },
    { I: CalendarCheck, label: "Interview Tracking" },
    { I: TrendingUp, label: "Hiring Insights" },
  ];
  const FeatureCard = ({ I, label }: { I: typeof Brain; label: string }) => (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"><I className="h-5 w-5" /></div>
      <div className="font-semibold leading-snug">{label}</div>
    </div>
  );
  return (
    <section className="py-24">
      <div className="container-x grid items-center gap-14 lg:grid-cols-2">
        <div>
          <SectionHeading center={false} eyebrow="For Candidates" title="Advance Your Career" desc="Know exactly where you stand, what to improve, and which roles are worth your time." />
          <Button asChild size="lg" className="mt-8 rounded-full bg-gradient-primary px-6 shadow-elevated"><Link to="/register">Create Candidate Profile <ArrowRight /></Link></Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {candidate.map(({ I, label }) => <FeatureCard key={label} I={I} label={label} />)}
        </div>
      </div>
      <div className="container-x mt-24 grid items-center gap-14 lg:grid-cols-2">
        <div className="order-last grid gap-4 sm:grid-cols-2 lg:order-first">
          {recruiter.map(({ I, label }) => <FeatureCard key={label} I={I} label={label} />)}
        </div>
        <div>
          <SectionHeading center={false} eyebrow="For Recruiters" title="Find Qualified Talent Faster" desc="Stop sifting through resumes. Start with candidates already scored against your role." />
          <Button asChild size="lg" className="mt-8 rounded-full bg-gradient-primary px-6 shadow-elevated"><Link to="/register">Create Recruiter Account <ArrowRight /></Link></Button>
        </div>
      </div>
    </section>
  );
}

function Intelligence() {
  const cards = [
    { t: "Match Intelligence", I: Target, items: ["Match Scores", "Skill Alignment", "Experience Alignment", "Technology Alignment"] },
    { t: "Career Intelligence", I: Brain, items: ["Career Readiness", "Skill Gap Analysis", "Career Recommendations", "Salary Intelligence"] },
    { t: "Recruiting Intelligence", I: LineChart, items: ["Candidate Ranking", "Talent Discovery", "Candidate Comparison", "Recruiting Pipelines"] },
    { t: "Recommendation Engine", I: Sparkles, items: ["Recommended Jobs", "Recommended Candidates", "Personalized Recommendations"] },
  ];
  return (
    <section className="bg-ink py-24 text-ink-foreground">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold md:text-5xl">Powered By Intelligence</h2>
          <p className="mt-4 text-lg text-ink-foreground/70">Four engines working together across the entire hiring lifecycle.</p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ t, I, items }) => (
            <div key={t} className="rounded-3xl border border-ink-foreground/10 bg-ink-foreground/5 p-7 transition hover:bg-ink-foreground/10">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground"><I className="h-5 w-5" /></span>
              <h3 className="mt-5 text-lg font-bold">{t}</h3>
              <ul className="mt-4 space-y-2.5">
                {items.map((i) => <li key={i} className="flex items-center gap-2 text-sm text-ink-foreground/75"><Check className="h-4 w-4 text-primary" /> {i}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


function Testimonials() {
  const t = [
    ["Sundance AI helped me understand exactly which opportunities matched my skills.", "Aisha Rahman", "Data Engineer"],
    ["We reduced candidate screening time significantly.", "Jordan Ellis", "Technical Recruiter"],
    ["The match transparency made hiring decisions easier.", "Sofia Martinez", "Engineering Hiring Manager"],
  ];
  return (
    <section className="bg-secondary py-24">
      <div className="container-x">
        <SectionHeading eyebrow="Testimonials" title="Loved by talent and teams" />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {t.map(([q, n, r]) => (
            <figure key={n} className="rounded-3xl border border-border bg-card p-8 shadow-soft">
              <Quote className="h-7 w-7 text-primary" />
              <blockquote className="mt-4 text-lg font-medium">“{q}”</blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary font-bold text-primary-foreground">{n?.charAt(0)}</span>
                <div><div className="text-sm font-semibold">{n}</div><div className="text-xs text-muted-foreground">{r}</div></div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="pb-24">
      <div className="container-x">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-primary px-8 py-16 text-center text-primary-foreground shadow-elevated md:py-20">
          <h2 className="text-3xl font-extrabold md:text-5xl">Start Hiring Smarter Today</h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">Join thousands of technology professionals and recruiters using skill-first intelligence.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="secondary" className="rounded-full px-6"><Link to="/register">Create Candidate Account</Link></Button>
            <Button asChild size="lg" variant="outline" className="rounded-full border-primary-foreground/40 bg-transparent px-6 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"><Link to="/register">Create Recruiter Account</Link></Button>
          </div>
        </div>
      </div>
    </section>
  );
}
