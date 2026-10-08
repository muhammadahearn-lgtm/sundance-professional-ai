import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import {
  ArrowRight, ArrowDown, Target, Brain, LineChart, Search, Gauge, Sparkles,
  Check, ListChecks, GitCompareArrows, Layers, CalendarCheck, TrendingUp,
  Briefcase, Star, MapPin, MessageSquare, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow, SectionHeading, PricingCards } from "@/components/site/shared";
import hero from "@/assets/hero.jpg";
import { PreviewBody } from "@/components/site/ProductPreviewMocks";
import { CompareShowcase } from "@/components/site/CompareShowcase";

const TITLE = "Sundance Professionals — Free Skill-First Tech Hiring Platform";
const DESC = "Skill-first match scores, job and candidate comparison, a hiring pipeline and an interviews hub for tech professionals and recruiters. Free during early access.";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: "Skill-Based Hiring, Technology Recruiting, Match Scores, Hiring Pipeline, Candidate Comparison, Career Intelligence" },
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
      <ComingSoonNotice />
      <Solution />
      <CompareShowcase />
      <SkillFirst />
      <AudienceSplit />
      <Intelligence />
      <ProductPreview />
      <HowItWorks />
      <section className="py-24">
        <div className="container-x">
          <SectionHeading eyebrow="Pricing" title="Free for everyone during early access" desc="Every feature is unlocked for candidates and recruiters. No credit card required." />
          <div className="mt-14"><PricingCards /></div>
        </div>
      </section>
      <FinalCta />
    </>
  );
}

function Hero() {
  const stats = [["5-factor", "Explainable match scores"], ["7-stage", "Hiring pipeline"], ["1-click", "Calendar links"], ["$0", "During early access"]];
  return (
    <section className="relative overflow-hidden bg-gradient-hero">
      <div className="container-x grid items-center gap-12 pb-16 pt-14 md:pt-20 lg:grid-cols-2">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Eyebrow><Sparkles className="h-3.5 w-3.5" /> Early access · Free for everyone</Eyebrow>
          <h1 className="mt-6 text-5xl font-extrabold leading-[1.05] md:text-6xl xl:text-7xl">
            Find the Right Opportunity.<br /><span className="text-gradient">Hire the Right Talent.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Skill-first hiring for technology. Candidates see exactly why a job fits. Recruiters see scored candidates, compare them side by side and run interviews from one pipeline.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full px-6 shadow-elevated"><Link to="/register">Join as Candidate <ArrowRight /></Link></Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-6"><Link to="/register">Join as Recruiter</Link></Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">No credit card. One role per account.</p>
        </div>
        <div className="relative animate-in fade-in zoom-in-95 duration-1000">
          <img src={hero} alt="Technology professionals matched with recruiters" width={1280} height={1024} className="w-full mix-blend-multiply" />
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


// TEMPORARY: remove <ComingSoonNotice /> (and this function) at official commercial launch.
function ComingSoonNotice() {
  return (
    <section className="py-12">
      <div className="container-x">
        <div className="relative overflow-hidden rounded-3xl border-2 border-primary/40 bg-card p-8 text-center shadow-elevated md:p-12">
          <div className="pointer-events-none absolute inset-0 bg-gradient-hero opacity-60" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-soft">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-foreground" />
              </span>
              Early Access Preview
            </span>
            <h2 className="mt-5 text-4xl font-extrabold md:text-5xl">
              Help us test <span className="text-gradient">Sundance Professionals</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              We're inviting our first community before the official launch. Every feature is free. Sign up as a candidate or recruiter, try it out and send us your feedback through the Contact page.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="rounded-full px-6"><Link to="/register">Join Early Access <ArrowRight /></Link></Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-6"><Link to="/contact">Send Feedback</Link></Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Solution() {
  const feats = [
    [Target, "Skill-First Match Scores", "Five clear factors show exactly why a job and a candidate fit."],
    [GitCompareArrows, "Side-by-Side Comparison", "Compare jobs or candidates, with an AI Top Pick and best-in-category highlights."],
    [Layers, "Kanban Hiring Pipeline", "Drag candidates from Saved to Hired — candidates see their status update."],
    [CalendarCheck, "Interviews Hub", "Online or in person, with Google, Outlook and Apple calendar links and reminders."],
    [MessageSquare, "Private Messaging", "Talk in-app. Personal emails and resumes stay private."],
    [LineChart, "Analytics & Career Intelligence", "Funnels, briefings, readiness and skill-gap insights for both sides."],
  ] as const;
  return (
    <section className="py-24">
      <div className="container-x">
        <SectionHeading eyebrow="What you can do today" title={<>Everything in <span className="text-gradient">Sundance Professionals</span></>} desc="Live features for technology professionals and recruiters — all free during early access." />
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
  const focus = ["Programming Languages", "Technologies & Tools", "Technical Skills", "Relevant Experience", "Career Readiness", "Match Intelligence"];
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
          <SectionHeading center={false} eyebrow="Skill-first hiring" title="Beyond Resumes. Beyond Keywords." desc="Traditional platforms focus on resumes and keywords. Sundance Professionals puts the focus on:" />
          <div className="mt-8 grid grid-cols-2 gap-3">
            {focus.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm font-medium"><Check className="h-4 w-4 text-primary" /> {f}</div>
            ))}
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Flow title="Traditional Hiring" steps={["Resume", "Keyword Search", "Manual Screening", "Interview"]} />
          <Flow good title="Sundance Professionals" steps={["Talent Profile", "AI Matching", "Candidate Discovery", "Hire"]} />
        </div>
      </div>
    </section>
  );
}

const PREVIEW_TABS = [
  { id: "candidate", label: "Candidate Dashboard", path: "sundanceprofessionals.com/candidate/dashboard" },
  { id: "recruiter", label: "Recruiter Pipeline", path: "sundanceprofessionals.com/recruiter/dashboard" },
  { id: "profile", label: "Candidate Profile", path: "sundanceprofessionals.com/candidate/profile" },
  { id: "jobs", label: "Job Search", path: "sundanceprofessionals.com/candidate/jobs" },
  { id: "talent", label: "Talent Search", path: "sundanceprofessionals.com/recruiter/candidates" },
] as const;
type PreviewTabId = (typeof PREVIEW_TABS)[number]["id"];

function Bar({ label, v, strong }: { label: string; v: number; strong?: boolean }) {
  return (
    <div>
      <div className="flex justify-between text-xs"><span className={strong ? "font-medium text-foreground" : "text-muted-foreground"}>{label}</span><span className="font-semibold">{v}%</span></div>
      <div className="mt-1.5 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-gradient-primary" style={{ width: `${v}%` }} /></div>
    </div>
  );
}


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

function StatCard({ I, n, l }: { I: typeof Briefcase; n: number | string; l: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <I className="h-5 w-5 text-primary" />
      <div className="mt-3 font-display text-3xl font-extrabold">{n}</div>
      <div className="mt-1 text-sm text-muted-foreground">{l}</div>
    </div>
  );
}

function PipelineCol({ title, n, people }: { title: string; n: number; people: string[] }) {
  return (
    <div className="rounded-2xl border border-border bg-primary-soft/50 p-4">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-sm font-bold text-primary">{n}</span>
      </div>
      <div className="mt-3 space-y-2">
        {people.map((p) => (
          <div key={p} className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-medium">{p}</div>
        ))}
      </div>
    </div>
  );
}

function JobRow({ title, sub, score }: { title: string; sub: string; score: number }) {
  return (
    <div className="flex items-center justify-between py-4">
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
      </div>
      <MatchBadge score={score} />
    </div>
  );
}

function ProductPreview() {
  const [tab, setTab] = useState<PreviewTabId>("talent");
  const active = PREVIEW_TABS.find((t) => t.id === tab)!;
  return (
    <section className="py-24">
      <div className="container-x">
        <SectionHeading eyebrow="Product preview" title="See Sundance Professionals in Action" desc="Explore the experience for candidates and recruiters." />
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
            <span className="h-3 w-3 rounded-full bg-warning" />
            <span className="h-3 w-3 rounded-full bg-success/80" />
            <span className="ml-4 text-xs text-muted-foreground">{active.path}</span>
          </div>
          <div className="bg-secondary/60 p-5 sm:p-8 lg:p-10">
            <PreviewBody tab={tab} />
          </div>
        </div>
      </div>
    </section>
  );
}

function AudienceSplit() {
  const candidate = [
    { I: Target, label: "Transparent Match Scores" },
    { I: GitCompareArrows, label: "Save & Compare Jobs" },
    { I: ListChecks, label: "Application Timeline" },
    { I: CalendarCheck, label: "Interviews Hub & Calendar" },
    { I: Gauge, label: "Career Readiness & Skill Gaps" },
    { I: MessageSquare, label: "In-App Messaging" },
  ];
  const recruiter = [
    { I: Search, label: "Talent Search with Scores" },
    { I: Star, label: "Compare Candidates & AI Top Pick" },
    { I: Layers, label: "Kanban Hiring Pipeline" },
    { I: MapPin, label: "Online & In-Person Interviews" },
    { I: Briefcase, label: "Company Page & Job Wizard" },
    { I: TrendingUp, label: "Hiring Analytics" },
  ];
  const FeatureCard = ({ I, label }: { I: typeof Brain; label: string }) => (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-elevated">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"><I className="h-5 w-5" /></div>
      <div className="font-semibold leading-snug">{label}</div>
    </div>
  );
  return (
    <section className="py-24">
      <div className="container-x grid items-center gap-14 lg:grid-cols-2">
        <div>
          <SectionHeading center={false} eyebrow="For Candidates" title="Know exactly where you stand" desc="See why each job fits you, compare roles side by side, follow every application and keep interviews in your own calendar." />
          <Button asChild size="lg" className="mt-8 rounded-full bg-gradient-primary px-6 shadow-elevated"><Link to="/register">Join as Candidate — Free <ArrowRight /></Link></Button>
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
          <SectionHeading center={false} eyebrow="For Recruiters" title="Hire qualified talent faster" desc="Post a job, see candidates already scored against it, compare the best side by side and move them through your pipeline to an interview." />
          <Button asChild size="lg" className="mt-8 rounded-full bg-gradient-primary px-6 shadow-elevated"><Link to="/register">Join as Recruiter — Free <ArrowRight /></Link></Button>
        </div>
      </div>
    </section>
  );
}

function Intelligence() {
  const weights: [string, number][] = [["Technical skills", 30], ["Programming languages", 20], ["Tools & technologies", 20], ["Relevant experience", 20], ["Preferences", 10]];
  return (
    <section className="bg-ink py-24 text-ink-foreground">
      <div className="container-x grid items-center gap-14 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-ink-foreground/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-ink-foreground/80"><Sparkles className="h-3.5 w-3.5 text-primary" /> How matching works</span>
          <h2 className="mt-4 text-3xl font-extrabold md:text-5xl">Fair, explainable match scores</h2>
          <p className="mt-4 text-lg text-ink-foreground/70">Every score is built from five factors you can see. Scores are calculated by the platform, so nobody can fake them.</p>
          <ul className="mt-8 space-y-3 text-sm text-ink-foreground/80">
            {["Degrees, soft skills, certifications and photos never affect the score", "One clean list of skills, languages and tools — no duplicates or misspellings", "Same scoring for candidates and recruiters"].map((t) => (
              <li key={t} className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {t}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-ink-foreground/10 bg-ink-foreground/5 p-8">
          <div className="text-sm font-semibold text-ink-foreground/70">Match score breakdown</div>
          <div className="mt-6 space-y-5">
            {weights.map(([l, v]) => (
              <div key={l}>
                <div className="flex justify-between text-sm"><span>{l}</span><span className="font-bold">{v}%</span></div>
                <div className="mt-2 h-2 rounded-full bg-ink-foreground/10"><div className="h-2 rounded-full bg-gradient-primary" style={{ width: `${v * 3.33}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps: [string, string, string][] = [
    ["1", "Create a free account", "Pick Candidate or Recruiter and confirm your email (check spam)."],
    ["2", "Build your profile", "Candidates add skills, languages and tools. Recruiters add a company and post a job."],
    ["3", "See your matches", "Candidates see scored jobs. Recruiters see scored candidates for each job."],
    ["4", "Connect & interview", "Message in-app, move candidates through the pipeline and schedule interviews."],
  ];
  return (
    <section className="bg-secondary py-24">
      <div className="container-x">
        <SectionHeading eyebrow="How it works" title="From sign-up to interview" />
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(([n, t, d]) => (
            <div key={n} className="rounded-3xl border border-border bg-card p-7 shadow-soft">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary font-display font-bold text-primary-foreground">{n}</span>
              <h3 className="mt-5 text-lg font-bold">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="py-24">
      <div className="container-x">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-primary px-8 py-16 text-center text-primary-foreground shadow-elevated md:py-20">
          <h2 className="text-3xl font-extrabold md:text-5xl">Be one of our first testers</h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">Everything is free during early access. Create an account, try it out and tell us what you think.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="secondary" className="rounded-full px-6"><Link to="/register">Join as Candidate</Link></Button>
            <Button asChild size="lg" variant="outline" className="rounded-full border-primary-foreground/40 bg-transparent px-6 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"><Link to="/register">Join as Recruiter</Link></Button>
          </div>
        </div>
      </div>
    </section>
  );
}
