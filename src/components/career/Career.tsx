import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Compass, RefreshCw, TrendingUp } from "lucide-react";
import { loadCareer, type CareerData } from "@/lib/career-data";
import { READINESS_WEIGHTS } from "@/lib/career-engine";
import { MatchBadge, useAutoRecalc } from "@/components/match/Match";
import { AiBrief, Bars, ChartCard, Section, Stat, Trend } from "@/components/analytics/Analytics";

const CAT = {
  lang: { label: "Programming language", cls: "border-violet/30 bg-violet/10 text-violet" },
  skill: { label: "Technical skill", cls: "border-indigo/30 bg-indigo/10 text-indigo" },
  tech: { label: "Tool / technology", cls: "border-teal/30 bg-teal/10 text-teal" },
};

/** Continuous pay band: conservative → expected → stretch, with market range shading. */
function SalarySpectrum({ s }: { s: { marketLow: number; marketHigh: number; conservative: number; expected: [number, number] | number[]; stretch: number; comparableJobs: number } }) {
  const lo = Math.min(s.marketLow, s.conservative), hi = Math.max(s.marketHigh, s.stretch) * 1.05;
  const pct = (n: number) => `${Math.max(0, Math.min(100, ((n - lo) / (hi - lo || 1)) * 100))}%`;
  const e0 = s.expected[0] ?? 0, e1 = s.expected[1] ?? 0;
  return (
    <div>
      <div className="relative mb-10 mt-8 h-3 rounded-full bg-muted">
        <div className="absolute inset-y-0 rounded-full bg-primary/15" style={{ left: pct(s.marketLow), right: `calc(100% - ${pct(s.marketHigh)})` }} />
        <div className="absolute inset-y-0 rounded-full bg-gradient-primary shadow-[0_0_16px_-2px_var(--primary)]" style={{ left: pct(e0), right: `calc(100% - ${pct(e1)})` }} />
        {([["Conservative", s.conservative, "bottom"], ["Expected", (e0 + e1) / 2, "top"], ["Stretch", s.stretch, "bottom"]] as const).map(([l, v, pos]) => (
          <div key={l} className="absolute -translate-x-1/2" style={{ left: pct(v), top: pos === "top" ? "-2.1rem" : "1.1rem" }}>
            <div className="whitespace-nowrap text-center text-[11px] text-muted-foreground"><b className="block text-sm text-foreground">{l === "Expected" ? `${money(e0)}–${money(e1)}` : `${money(v)}${l === "Stretch" ? "+" : ""}`}</b>{l}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Market range {money(s.marketLow)}–{money(s.marketHigh)} (light band) from {s.comparableJobs} comparable job{s.comparableJobs === 1 ? "" : "s"}, adjusted ±2% per year of experience (max ±15%). Stretch is 10% above the top of the range.</p>
    </div>
  );
}

const card = "rounded-2xl border border-border bg-card p-5 shadow-soft";
const money = (n: number) => `$${Math.round(n / 1000)}k`;
const prioCls = { High: "bg-destructive/10 text-destructive", Medium: "bg-warning/15 text-warning", Low: "bg-muted text-muted-foreground" };

/** Runs a match recalculation first, then builds the career report from fresh scores. */
export function useCareer(uid: string) {
  const r = useAutoRecalc();
  const q = useQuery({ queryKey: ["match", "career", uid], queryFn: () => loadCareer(uid), enabled: !r.isPending });
  return { q, recalc: r };
}

function Ring({ v }: { v: number }) {
  const deg = Math.round((v / 100) * 360);
  return <div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full shadow-[0_0_30px_-8px_var(--primary)]" style={{ background: `conic-gradient(var(--primary-glow, var(--primary)) 0deg, var(--primary) ${deg}deg, var(--muted) 0)` }}><div className="grid h-[92px] w-[92px] place-items-center rounded-full bg-card"><span className="text-center"><span className="block text-3xl font-extrabold tabular-nums">{v}</span><span className="text-[10px] text-muted-foreground">/ 100</span></span></div></div>;
}
function Chips({ items, tone = "muted" }: { items: string[]; tone?: "muted" | "danger" | "primary" }) {
  const cls = tone === "danger" ? "bg-destructive/10 text-destructive" : tone === "primary" ? "bg-primary-soft text-primary" : "bg-muted text-foreground";
  if (!items.length) return <p className="text-xs text-muted-foreground">None</p>;
  return <div className="flex flex-wrap gap-1.5">{items.map((x) => <span key={x} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{x}</span>)}</div>;
}
function Head({ title, children }: { title: string; children?: React.ReactNode }) {
  return <div className="mb-3 flex items-center gap-2"><h2 className="font-display font-bold">{title}</h2><div className="ml-auto">{children}</div></div>;
}

function Readiness({ d }: { d: CareerData }) {
  const r = d.report.readiness;
  const labels: Record<string, string> = { completion: "Profile", skills: "Skills", technologies: "Technologies", experience: "Experience", certifications: "Certifications" };
  return (
    <div className="flex flex-wrap items-center gap-5">
      <Ring v={r.score} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="font-display text-lg font-bold">{r.tier}</p>
        {Object.entries(r.parts).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2 text-xs"><span className="w-28 text-muted-foreground">{labels[k]} ({READINESS_WEIGHTS[k as keyof typeof READINESS_WEIGHTS]}%)</span><div className="h-1.5 flex-1 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-gradient-primary" style={{ width: `${v}%` }} /></div><span className="w-8 text-right font-semibold">{v}</span></div>
        ))}
      </div>
    </div>
  );
}

function Wrap({ q, children }: { q: ReturnType<typeof useCareer>["q"]; children: (d: CareerData) => React.ReactNode }) {
  if (q.isLoading || q.isPending) return <div className={`${card} h-48 animate-pulse`} />;
  if (q.error) return <div className={card}><p className="font-semibold">{q.error.message === "Missing Candidate Data" ? "Insufficient Profile Information" : "Unable To Generate Career Intelligence"}</p><button onClick={() => q.refetch()} className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Try again</button></div>;
  return <>{children(q.data!)}</>;
}

/** Candidate dashboard widget. */
export function CareerWidget({ uid }: { uid: string }) {
  const { q } = useCareer(uid);
  return (
    <section className={card}>
      <Head title="Career Intelligence"><Link to="/candidate/career" className="text-xs font-semibold text-primary hover:underline">Open</Link></Head>
      <Wrap q={q}>{(d) => (
        <div className="space-y-4">
          <Readiness d={d} />
          <div><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Skill gaps</p><Chips tone="danger" items={d.report.skillGaps.slice(0, 4).map((g) => g.name)} /></div>
          <div><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Technology gaps</p><Chips tone="danger" items={d.report.techGaps.slice(0, 4).map((g) => g.name)} /></div>
          <div><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Learning priorities</p><ul className="space-y-0.5 text-sm">{d.report.recommendations.slice(0, 3).map((r) => <li key={r.title}>→ {r.title}</li>)}</ul></div>
          {d.report.salary && <div><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Salary intelligence</p><p className="text-sm"><b>{money(d.report.salary.expected[0])}–{money(d.report.salary.expected[1])}</b> expected · stretch {money(d.report.salary.stretch)}+</p></div>}
          {d.report.topMatches.length > 0 && <div><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top opportunities</p><ul className="space-y-1">{d.report.topMatches.slice(0, 3).map((m) => <li key={m.jobId} className="flex items-center justify-between gap-2 text-sm"><Link to="/candidate/jobs/$id" params={{ id: m.jobId }} className="truncate font-medium hover:text-primary">{d.jobInfo[m.jobId]?.title}</Link><MatchBadge score={m.overall} /></li>)}</ul></div>}
        </div>
      )}</Wrap>
    </section>
  );
}

/** Full Career Intelligence page. */
export function CareerPage({ uid }: { uid: string }) {
  const { q, recalc } = useCareer(uid);
  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-2xl font-extrabold sm:text-3xl">Career Intelligence</h1><p className="text-sm text-muted-foreground">A transparent read on your readiness, gaps and next steps — every number explained.</p></div>
        <button onClick={() => recalc.mutate(undefined, { onSuccess: () => q.refetch() })} disabled={recalc.isPending || q.isFetching} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold hover:border-primary hover:text-primary disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${recalc.isPending || q.isFetching ? "animate-spin" : ""}`} />Recalculate</button>
      </div>
      <Wrap q={q}>{(d) => { const r = d.report; const gaps = [...r.langGaps.map((g) => ({ ...g, c: "lang" as const })), ...r.skillGaps.map((g) => ({ ...g, c: "skill" as const })), ...r.techGaps.map((g) => ({ ...g, c: "tech" as const }))].sort((a, b) => b.impact - a.impact); const top = gaps[0]; return (
        <div className="space-y-8">
          <AiBrief points={[
            `You're at ${r.readiness.score} readiness — ${r.readiness.tier}.`,
            top ? `Fastest lever: adding ${top.name} could lift your average match ~${top.impact}%.` : "No major skill gaps against current jobs — keep your profile fresh.",
            r.salary ? `Expected pay for your profile: ${money(r.salary.expected[0])}–${money(r.salary.expected[1])}, stretch ${money(r.salary.stretch)}+.` : "Salary benchmark appears once comparable jobs list pay.",
            `${r.topMatches.length} top job match${r.topMatches.length === 1 ? "" : "es"} out of ${r.market.jobs} active jobs.`,
          ]} />

          <Section title="Readiness & Insights" desc={`Skills, technologies and experience come from your top ${r.topMatches.length || "—"} job matches${r.topMatches.length ? "" : " (estimated from your profile)"}.`}>
            <div className="grid gap-4 lg:grid-cols-5">
              <div className="lg:col-span-2"><ChartCard title="Career Readiness"><Readiness d={d} /></ChartCard></div>
              <div className="lg:col-span-3"><ChartCard title="Insights">
                <div className="grid gap-3 sm:grid-cols-2">
                  {([["Strengths", r.insights.strengths, "border-success/30 bg-success/5", "text-success"], ["Weaknesses", r.insights.weaknesses, "border-destructive/30 bg-destructive/5", "text-destructive"], ["Growth Opportunities", r.insights.growth, "border-primary/30 bg-primary-soft/40", "text-primary"], ["Risk Areas", r.insights.risks, "border-warning/30 bg-warning/5", "text-warning"]] as const).map(([t, xs, box, c]) => (
                    <div key={t} className={`rounded-xl border p-3 ${box}`}><p className={`text-xs font-bold uppercase tracking-wide ${c}`}>{t}</p>{xs.length ? <ul className="mt-1.5 space-y-1 text-sm">{xs.map((x) => <li key={x} className="flex gap-1.5"><span className={c}>•</span>{x}</li>)}</ul> : <p className="mt-1 text-xs text-muted-foreground">None right now</p>}</div>
                  ))}
                </div>
              </ChartCard></div>
            </div>
          </Section>

          <Section title="Gap Analysis" desc="Ranked by how much each item would lift your average match.">
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="Highest-Impact Gaps" empty={!gaps.length}>
                <ul className="space-y-3">{gaps.slice(0, 8).map((g, i) => { const max = Math.max(1, gaps[0]!.impact); return (
                  <li key={g.c + g.name}>
                    <div className="mb-1.5 flex items-center gap-2 text-sm">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${CAT[g.c].cls}`} title={CAT[g.c].label}>{g.name}</span>
                      <span className="text-[11px] text-muted-foreground">{CAT[g.c].label}</span>
                      <span className="ml-auto rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold tabular-nums text-primary">+{g.impact}% match</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted/70"><div className="h-full rounded-full bg-gradient-primary shadow-[0_0_12px_-2px_var(--primary)] transition-all duration-700" style={{ width: `${Math.max(4, (g.impact / max) * 100)}%`, opacity: 1 - Math.min(i, 5) * 0.1 }} /></div>
                  </li>); })}</ul>
              </ChartCard>
              <ChartCard title="What You Already Have">
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Languages & skills</p>
                <Chips items={[...r.current.languages, ...r.current.skills]} />
                <p className="mb-2 mt-4 text-xs font-semibold uppercase text-muted-foreground">Tools & technologies</p>
                <Chips items={r.current.technologies} />
              </ChartCard>
            </div>
          </Section>

          <Section title="Market & Salary" desc={`Based on ${r.market.jobs} active job${r.market.jobs === 1 ? "" : "s"} on Sundance Professionals.`}>
            <div className="grid gap-4 lg:grid-cols-3">
              <ChartCard title="Top Skills In Demand" empty={!r.market.skills.length}><Bars data={r.market.skills.slice(0, 6).map((x) => ({ name: x.name, value: x.demand }))} /></ChartCard>
              <ChartCard title="Top Technologies In Demand" empty={!r.market.technologies.length}><Bars data={r.market.technologies.slice(0, 6).map((x) => ({ name: x.name, value: x.demand }))} /></ChartCard>
              <ChartCard title="Most Posted Roles" empty={!r.market.roles.length}><Bars data={r.market.roles.slice(0, 6).map((x) => ({ name: x.name, value: x.jobs }))} /></ChartCard>
            </div>
            <ChartCard title="Salary Spectrum" empty={!r.salary}>
              {r.salary && <SalarySpectrum s={r.salary} />}
            </ChartCard>
          </Section>

          <Section title="Growth Path">
            <ChartCard title="Career Growth Roadmap">
              <ol className="relative grid gap-4 md:grid-cols-4">
                <div className="pointer-events-none absolute left-6 right-6 top-6 hidden h-0.5 bg-gradient-to-r from-primary via-primary/40 to-border md:block" />
                {r.roadmap.map((s, i) => (
                  <li key={s.role + i} className="relative">
                    <div className={`relative z-10 mb-3 grid h-12 w-12 place-items-center rounded-full border-2 text-sm font-extrabold tabular-nums ${s.current ? "border-primary bg-gradient-primary text-primary-foreground shadow-[0_0_20px_-4px_var(--primary)]" : "border-primary/40 bg-card text-primary"}`}>{s.readiness}</div>
                    <p className="text-[11px] font-semibold uppercase text-muted-foreground">{s.current ? "Current role" : i === 1 ? "Suggested next role" : "Future role"}</p>
                    <p className="font-display font-bold">{s.role}</p>
                    {!s.current && (s.skills.length + s.technologies.length > 0) && <div className="mt-2"><Chips items={[...s.skills, ...s.technologies]} /></div>}
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-xs text-muted-foreground">Circle = estimated readiness. Each step assumes ~15 points less until you close the listed gaps.</p>
            </ChartCard>
            <ChartCard title="Career Recommendations">
              <div className="grid gap-3 md:grid-cols-2">{r.recommendations.map((x) => (
                <div key={x.title} className="rounded-xl border border-border bg-muted/20 p-4 transition-colors hover:border-primary/40"><div className="flex items-start gap-2"><p className="font-semibold">{x.title}</p><span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${prioCls[x.priority]}`}>{x.priority} Impact</span></div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{x.why}</p><p className="mt-1 text-xs"><span className="font-semibold text-primary">→</span> {x.impact}</p></div>
              ))}</div>
            </ChartCard>
          </Section>

          <Section title="Opportunities & Progress">
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="Top Job Opportunities" empty={!r.topMatches.length}>
                <ul className="space-y-2">{r.topMatches.map((m) => <li key={m.jobId} className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm"><div className="min-w-0"><Link to="/candidate/jobs/$id" params={{ id: m.jobId }} className="block truncate font-semibold hover:text-primary">{d.jobInfo[m.jobId]?.title}</Link><span className="text-xs text-muted-foreground">{d.jobInfo[m.jobId]?.company}</span></div><MatchBadge score={m.overall} /></li>)}</ul>
              </ChartCard>
              <ChartCard title="Career Trend">
                {d.history.length < 2 ? <p className="text-sm text-muted-foreground">Your history starts today ({r.readiness.score} readiness). Check back after updating your profile to see your progress.</p> : (() => { const a = d.history[0]!, b = d.history[d.history.length - 1]!; const delta = (x: number | null, y: number | null) => (x == null || y == null ? "—" : `${Number(y) - Number(x) >= 0 ? "+" : ""}${Math.round(Number(y) - Number(x))}`); return (
                  <>
                    <Trend height={180} data={d.history.map((h) => ({ x: h.snapshot_date.slice(5), readiness: Number(h.readiness_score), match: h.average_match == null ? null : Math.round(Number(h.average_match)) }))} keys={[{ k: "readiness", name: "Readiness" }, { k: "match", name: "Avg match" }]} />
                    <div className="mt-3"><Stat items={[["Readiness", delta(a.readiness_score, b.readiness_score)], ["Avg match", delta(a.average_match, b.average_match)], ["Skills added", delta(a.skill_count, b.skill_count)], ["Tech added", delta(a.technology_count, b.technology_count)]]} /></div>
                    <p className="mt-2 text-[11px] text-muted-foreground">Since {a.snapshot_date}</p>
                  </>); })()}
              </ChartCard>
            </div>
          </Section>
        </div>
      ); }}</Wrap>
    </div>
  );
}
