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
      <Transparency />
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

function Bar({ label, v }: { label: string; v: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-semibold">{v}%</span></div>
      <div className="mt-1.5 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-gradient-primary" style={{ width: `${v}%` }} /></div>
    </div>
  );
}


function Transparency() {
  const explains = ["Why you match", "Which skills align", "Which technologies align", "Missing skills", "Career readiness"];
  return (
    <section className="bg-secondary py-24">
      <div className="container-x grid items-center gap-14 lg:grid-cols-2">
        <div>
          <SectionHeading center={false} eyebrow="Why Sundance AI" title="Transparent Hiring Intelligence" desc="Every match should explain:" />
          <ul className="mt-6 space-y-3">
            {explains.map((e) => <li key={e} className="flex items-center gap-3 font-medium"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-soft"><Check className="h-3.5 w-3.5 text-primary" /></span>{e}</li>)}
          </ul>
        </div>
        <div className="rounded-3xl border border-border bg-card p-8 shadow-elevated">
          <div className="flex items-center gap-6">
            <div className="relative h-32 w-32 shrink-0">
              <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-muted" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-primary" strokeWidth="3" strokeDasharray="95 100" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="font-display text-3xl font-extrabold">95%</span><span className="text-xs text-muted-foreground">Match Score</span></div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Senior ML Engineer</div>
              <div className="font-display text-xl font-bold">Excellent match</div>
              <div className="mt-2 flex flex-wrap gap-1.5">{["Python", "PyTorch", "AWS"].map((t) => <span key={t} className="rounded-md bg-primary-soft px-2 py-0.5 text-xs font-medium text-accent-foreground">{t}</span>)}<span className="rounded-md border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground">Missing: Kubeflow</span></div>
            </div>
          </div>
          <div className="mt-8 space-y-4">
            <Bar label="Skill Alignment" v={96} />
            <Bar label="Experience Alignment" v={92} />
            <Bar label="Career Readiness" v={89} />
          </div>
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
