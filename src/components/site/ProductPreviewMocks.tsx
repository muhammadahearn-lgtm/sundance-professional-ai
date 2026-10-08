import type { ReactNode } from "react";
import { Bookmark, Briefcase, Eye, GitCompare, MapPin, MessageSquare, Search, Send, SlidersHorizontal, Sparkles, Target, TrendingUp, Users, ChevronDown, Share2, Building2 } from "lucide-react";

// Static illustrative mockups of real app screens for the landing page. Sample data only.

const card = "rounded-2xl border border-border bg-card p-5 shadow-soft";

function Score({ n }: { n: number }) {
  const label = n >= 80 ? "Strong Match" : n >= 60 ? "Good Match" : "Fair Match";
  return (
    <div className="flex shrink-0 flex-col items-center rounded-xl bg-primary-soft px-3 py-2 text-center">
      <span className="font-display text-xl font-extrabold text-primary">{n}%</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  );
}
function Tag({ children, soft }: { children: ReactNode; soft?: boolean }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${soft ? "border border-border text-muted-foreground" : "bg-primary-soft text-primary"}`}>{children}</span>;
}
function Avatar({ i }: { i: string }) {
  return <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-primary font-display text-sm font-bold text-primary-foreground">{i}</span>;
}
function Logo({ i }: { i: string }) {
  return <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary font-display text-sm font-bold text-primary">{i}</span>;
}
function Select({ label }: { label: string }) {
  return <span className="flex h-10 min-w-40 items-center justify-between gap-2 rounded-xl border border-input bg-background px-3 text-sm text-muted-foreground">{label}<ChevronDown className="h-4 w-4" /></span>;
}
function Stat({ I, n, l }: { I: typeof Briefcase; n: ReactNode; l: string }) {
  return (
    <div className={card}>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary"><I className="h-4 w-4" /></span>
      <div className="mt-3 text-2xl font-extrabold">{n}</div>
      <div className="text-sm text-muted-foreground">{l}</div>
    </div>
  );
}
const btn = "inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold";

function JobCard({ logo, title, co, loc, meta, salary, tags, score }: { logo: string; title: string; co: string; loc: string; meta: string; salary: string; tags: string[]; score: number }) {
  return (
    <div className={card}>
      <div className="flex items-start gap-4">
        <Logo i={logo} />
        <div className="min-w-0 flex-1">
          <div className="font-display font-bold">{title}</div>
          <div className="text-sm text-muted-foreground">{co}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{loc}</span><span>{meta}</span></div>
          <div className="mt-3 flex flex-wrap gap-1.5">{tags.map((t) => <Tag key={t}>{t}</Tag>)}</div>
          <div className="mt-3 text-sm font-semibold">{salary}</div>
        </div>
        <Score n={score} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
        <span className={`${btn} bg-primary text-primary-foreground border-primary`}>View Job</span>
        <span className={btn}><Bookmark className="h-3.5 w-3.5" />Save</span>
        <span className={btn}><GitCompare className="h-3.5 w-3.5" />Compare</span>
        <span className={btn}><Share2 className="h-3.5 w-3.5" />Share</span>
      </div>
    </div>
  );
}

function JobSearch() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-muted-foreground"><Search className="h-4 w-4" />Job title, skill, technology, language or company</div>
        <span className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Search</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <aside className={`${card} hidden space-y-4 lg:block`}>
          <div className="flex items-center gap-2 font-bold"><SlidersHorizontal className="h-4 w-4" />Filters</div>
          {[["Company", "All companies"], ["Job", "All jobs"], ["Work arrangement", "Remote, Hybrid"], ["Experience", "3+ years"]].map(([l, v]) => (
            <div key={l}><div className="text-xs font-semibold text-muted-foreground">{l}</div><div className="mt-1 rounded-lg border border-input px-3 py-2 text-sm">{v}</div></div>
          ))}
        </aside>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm"><span><b>24</b> <span className="text-muted-foreground">active jobs</span></span><Select label="Best match" /></div>
          <JobCard logo="SP" title="Data Scientist – Deep Learning" co="Sundance Labs" loc="Boston, Massachusetts, United States" meta="Hybrid · Full-Time · 3+ yrs" salary="$140,000 – $185,000 USD" tags={["Python", "PyTorch", "Machine Learning"]} score={92} />
          <JobCard logo="NC" title="Senior Data Engineer" co="Northwind Cloud" loc="Remote · United States" meta="Remote · Full-Time · 5+ yrs" salary="$150,000 – $190,000 USD" tags={["SQL", "Apache Spark", "Apache Airflow"]} score={78} />
        </div>
      </div>
    </div>
  );
}

function CandidateDashboard() {
  return (
    <div className="space-y-4">
      <div>
        <div className="font-display text-2xl font-extrabold">Welcome back, Maya</div>
        <div className="text-sm text-muted-foreground">Here's where your job search stands today.</div>
      </div>
      <div className={`${card} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex items-center gap-4"><Avatar i="MC" /><div><div className="font-bold">Maya Chen</div><div className="text-sm text-muted-foreground">Machine Learning Engineer · Austin, Texas</div></div></div>
        <div className="w-full sm:w-64"><div className="flex justify-between text-xs"><span>Profile completion</span><b>88%</b></div><div className="mt-1.5 h-2 rounded-full bg-muted"><div className="h-2 w-[88%] rounded-full bg-gradient-primary" /></div></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat I={Briefcase} n={6} l="Applications" />
        <Stat I={Bookmark} n={5} l="Saved jobs" />
        <Stat I={TrendingUp} n="84%" l="Career readiness" />
        <Stat I={Eye} n={23} l="Profile views" />
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <div className={`${card} lg:col-span-3`}>
          <h3 className="font-bold">Top matches for you</h3>
          <div className="mt-2 divide-y divide-border">
            {[["Data Scientist – Deep Learning", "Sundance Labs · Hybrid", 92], ["ML Platform Engineer", "Brightpath · Remote", 86], ["Senior Data Engineer", "Northwind Cloud · Remote", 78]].map(([t, s, n]) => (
              <div key={t as string} className="flex items-center justify-between gap-3 py-3"><div><div className="text-sm font-semibold">{t}</div><div className="text-xs text-muted-foreground">{s}</div></div><span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">{n}%</span></div>
            ))}
          </div>
        </div>
        <div className={`${card} lg:col-span-2`}>
          <h3 className="font-bold">Applications by status</h3>
          <div className="mt-4 space-y-3">
            {[["Applied", 3], ["Under review", 1], ["Interviewing", 2], ["Offer", 0]].map(([l, n]) => (
              <div key={l as string} className="flex items-center gap-3 text-sm"><span className="w-24 shrink-0">{l}</span><div className="h-2 flex-1 rounded-full bg-muted"><div className="h-2 rounded-full bg-gradient-primary" style={{ width: `${((n as number) / 3) * 100}%` }} /></div><span className="w-4 text-right text-muted-foreground">{n}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RecruiterDashboard() {
  const cols: [string, string[]][] = [["Saved", ["Maya Chen", "Daniel Brooks"]], ["Contacted", ["Aisha Khan"]], ["Interviewing", ["Leo Martins", "Sofia Rossi"]], ["Shortlisted", ["Ethan Park"]]];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><div className="font-display text-2xl font-extrabold">Welcome back, Jordan</div><div className="text-sm text-muted-foreground">Your hiring workspace at a glance.</div></div>
        <span className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Briefcase className="h-4 w-4" />Post a Job</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat I={Briefcase} n={4} l="Active jobs" />
        <Stat I={Send} n={37} l="Applications" />
        <Stat I={Users} n={12} l="In pipeline" />
        <Stat I={Target} n="81%" l="Avg. match of applicants" />
      </div>
      <div className={card}>
        <div className="flex items-center justify-between"><h3 className="font-bold">Pipeline · Data Scientist – Deep Learning</h3><span className="text-xs font-semibold text-primary">Open pipeline</span></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cols.map(([t, people]) => (
            <div key={t} className="rounded-xl border border-border bg-secondary/60 p-3">
              <div className="flex justify-between text-sm font-semibold"><span>{t}</span><span className="text-primary">{people.length}</span></div>
              <div className="mt-2 space-y-2">
                {people.map((p) => (
                  <div key={p} className="rounded-lg border border-border bg-card p-2.5">
                    <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-primary text-[10px] font-bold text-primary-foreground">{p.split(" ").map((w) => w[0]).join("")}</span><span className="text-sm font-semibold">{p}</span></div>
                    <div className="mt-2 flex gap-1.5 border-t border-border pt-2"><span className={btn}><MessageSquare className="h-3 w-3" />Message</span><span className={`${btn} flex-1 justify-between`}>{t}<ChevronDown className="h-3 w-3" /></span></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CandidateProfile() {
  const groups: [string, string[]][] = [["Programming Languages", ["Python", "SQL", "R"]], ["Technologies & Tools", ["PyTorch", "TensorFlow", "Apache Spark", "AWS"]], ["Technical Skills", ["Machine Learning", "Deep Learning", "Data Modeling"]]];
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className={`${card} text-center`}>
        <span className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-primary font-display text-2xl font-bold text-primary-foreground">MC</span>
        <div className="mt-4 font-display text-lg font-bold">Maya Chen</div>
        <div className="text-sm text-muted-foreground">Machine Learning Engineer · Senior</div>
        <div className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />Austin, Texas, United States</div>
        <div className="mt-5 space-y-2 text-left text-sm">
          {[["Experience", "6 years"], ["Availability", "Open to opportunities"], ["Work arrangement", "Remote, Hybrid"], ["Salary expectation", "$160,000 USD"]].map(([l, v]) => (
            <div key={l} className="flex justify-between gap-2 border-t border-border pt-2"><span className="text-muted-foreground">{l}</span><span className="font-medium">{v}</span></div>
          ))}
        </div>
      </div>
      <div className={`${card} space-y-5 lg:col-span-2`}>
        <div><h3 className="font-bold">Professional Summary</h3><p className="mt-2 text-sm text-muted-foreground">ML engineer focused on deep learning and production model pipelines for healthcare and fintech.</p></div>
        {groups.map(([t, items]) => (
          <div key={t}><h3 className="text-sm font-bold">{t}</h3><div className="mt-2 flex flex-wrap gap-1.5">{items.map((s) => <Tag key={s}>{s}</Tag>)}</div></div>
        ))}
        <div>
          <h3 className="text-sm font-bold">Work Experience</h3>
          <div className="mt-2 space-y-3">
            {[["Senior ML Engineer", "Brightpath Health · 2021 – Present"], ["Data Scientist", "Lumen Analytics · 2018 – 2021"]].map(([t, s]) => (
              <div key={t} className="flex gap-3"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" /><div><div className="text-sm font-semibold">{t}</div><div className="text-xs text-muted-foreground">{s}</div></div></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TalentSearch() {
  const people: [string, string, string, string[], number][] = [
    ["MC", "Maya Chen", "Machine Learning Engineer · 6 yrs", ["Python", "PyTorch", "AWS"], 94],
    ["DB", "Daniel Brooks", "Data Scientist · 4 yrs", ["Python", "TensorFlow", "SQL"], 88],
    ["AK", "Aisha Khan", "AI Engineer · 5 yrs", ["Deep Learning", "Apache Spark"], 83],
    ["LM", "Leo Martins", "Data Engineer · 7 yrs", ["SQL", "Apache Airflow"], 71],
  ];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="flex min-w-60 flex-1 items-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-muted-foreground"><Search className="h-4 w-4" />Search by name, title or skill</div>
        <Select label="Sundance Labs" />
        <Select label="Data Scientist – Deep Learning" />
      </div>
      <div className="flex flex-wrap gap-1.5"><Tag>Python</Tag><Tag>3+ years</Tag><Tag>Remote</Tag><Tag soft>Clear filters</Tag></div>
      <div className="grid gap-3 sm:grid-cols-2">
        {people.map(([i, n, s, tags, score]) => (
          <div key={n} className={card}>
            <div className="flex items-start gap-3">
              <Avatar i={i} />
              <div className="min-w-0 flex-1"><div className="font-bold">{n}</div><div className="text-xs text-muted-foreground">{s}</div><div className="mt-2 flex flex-wrap gap-1.5">{tags.map((t) => <Tag key={t}>{t}</Tag>)}</div></div>
              <Score n={score} />
            </div>
            <div className="mt-4 flex gap-2 border-t border-border pt-3"><span className={btn}><MessageSquare className="h-3.5 w-3.5" />Message</span><span className={btn}><Bookmark className="h-3.5 w-3.5" />Save</span><span className={btn}><GitCompare className="h-3.5 w-3.5" />Compare</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PreviewBody({ tab }: { tab: string }) {
  const body = tab === "candidate" ? <CandidateDashboard /> : tab === "recruiter" ? <RecruiterDashboard /> : tab === "profile" ? <CandidateProfile /> : tab === "jobs" ? <JobSearch /> : <TalentSearch />;
  return (
    <div className="mx-auto max-w-5xl">
      {body}
      <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><Sparkles className="h-3.5 w-3.5 text-primary" />Sample data shown for illustration<Building2 className="hidden" /></p>
    </div>
  );
}
