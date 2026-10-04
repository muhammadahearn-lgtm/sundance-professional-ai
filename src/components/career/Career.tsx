import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Compass, RefreshCw, TrendingUp } from "lucide-react";
import { loadCareer, type CareerData } from "@/lib/career-data";
import { READINESS_WEIGHTS } from "@/lib/career-engine";
import { MatchBadge, useAutoRecalc } from "@/components/match/Match";

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
  return <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(var(--primary) ${deg}deg, var(--muted) 0)` }}><div className="grid h-[76px] w-[76px] place-items-center rounded-full bg-card"><span className="text-2xl font-extrabold">{v}</span></div></div>;
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
      <Wrap q={q}>{(d) => { const r = d.report; return (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className={card}><Head title="Career Readiness" /><Readiness d={d} /><p className="mt-3 text-xs text-muted-foreground">Skills, technologies and experience come from your top {r.topMatches.length || "—"} job matches{r.topMatches.length ? "" : " (no matches yet, so estimated from your profile)"}.</p></section>

          <section className={card}><Head title="Insights" />
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              {([["Strengths", r.insights.strengths, "text-success"], ["Weaknesses", r.insights.weaknesses, "text-destructive"], ["Growth Opportunities", r.insights.growth, "text-primary"], ["Risk Areas", r.insights.risks, "text-warning"]] as const).map(([t, xs, c]) => (
                <div key={t}><p className={`text-xs font-semibold uppercase tracking-wide ${c}`}>{t}</p>{xs.length ? <ul className="mt-1 space-y-0.5">{xs.map((x) => <li key={x}>• {x}</li>)}</ul> : <p className="mt-1 text-xs text-muted-foreground">None right now</p>}</div>
              ))}
            </div>
          </section>

          <section className={card}><Head title="Skill Gap Analysis" />
            <p className="text-xs font-semibold uppercase text-muted-foreground">Current</p><Chips items={[...r.current.languages, ...r.current.skills]} />
            <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">Missing</p><Chips tone="danger" items={[...r.langGaps, ...r.skillGaps].map((g) => g.name)} />
            <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">Priority</p><Chips tone="primary" items={[...r.langGaps, ...r.skillGaps].sort((a, b) => b.impact - a.impact).slice(0, 3).map((g) => `${g.name} · +${g.impact}%`)} />
          </section>

          <section className={card}><Head title="Technology Gap Analysis" />
            <p className="text-xs font-semibold uppercase text-muted-foreground">Current</p><Chips items={r.current.technologies} />
            <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">Missing</p><Chips tone="danger" items={r.techGaps.map((g) => g.name)} />
            <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">High demand</p><Chips items={r.market.technologies.slice(0, 4).map((t) => t.name)} />
            <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">Learning priority</p><Chips tone="primary" items={r.techGaps.slice(0, 3).map((g) => `${g.name} · +${g.impact}%`)} />
          </section>

          <section className={card}><Head title="Market Demand" />
            <p className="mb-2 text-xs text-muted-foreground">Based on {r.market.jobs} active job{r.market.jobs === 1 ? "" : "s"} on Sundance.</p>
            <div className="grid gap-3 sm:grid-cols-3 text-sm">
              {([["Top skills", r.market.skills.map((x) => x.name)], ["Top technologies", r.market.technologies.map((x) => x.name)], ["Most posted roles", r.market.roles.map((x) => `${x.name} (${x.jobs})`)]] as const).map(([t, xs]) => <div key={t}><p className="text-xs font-semibold uppercase text-muted-foreground">{t}</p>{xs.length ? <ol className="mt-1 space-y-0.5">{xs.map((x, i) => <li key={x}>{i + 1}. {x}</li>)}</ol> : <p className="text-xs text-muted-foreground">No data yet</p>}</div>)}
            </div>
          </section>

          <section className={card}><Head title="Salary Intelligence" />
            {r.salary ? <>
              <div className="grid grid-cols-2 gap-2 text-center text-sm">
                {([["Current market range", `${money(r.salary.marketLow)}–${money(r.salary.marketHigh)}`], ["Conservative", money(r.salary.conservative)], ["Expected range", `${money(r.salary.expected[0])}–${money(r.salary.expected[1])}`], ["Stretch", `${money(r.salary.stretch)}+`]] as const).map(([l, v]) => <div key={l} className="rounded-xl bg-muted/60 p-3"><p className="text-lg font-extrabold">{v}</p><p className="text-xs text-muted-foreground">{l}</p></div>)}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">From {r.salary.comparableJobs} comparable job{r.salary.comparableJobs === 1 ? "" : "s"} for your role, adjusted ±2% per year of experience versus their requirements (max ±15%). Stretch is 10% above the top of the range.</p>
            </> : <p className="text-sm text-muted-foreground">Salary Data Unavailable — no comparable jobs list a salary yet.</p>}
          </section>

          <section className={`${card} lg:col-span-2`}><Head title="Career Recommendations" />
            <div className="grid gap-3 md:grid-cols-2">{r.recommendations.map((x) => (
              <div key={x.title} className="rounded-xl border border-border p-4"><div className="flex items-start gap-2"><p className="font-semibold">{x.title}</p><span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${prioCls[x.priority]}`}>{x.priority} Impact</span></div>
                <dl className="mt-2 space-y-0.5 text-xs"><div><dt className="inline font-semibold">Why: </dt><dd className="inline text-muted-foreground">{x.why}</dd></div><div><dt className="inline font-semibold">Impact: </dt><dd className="inline text-muted-foreground">{x.impact}</dd></div><div><dt className="inline font-semibold">Outcome: </dt><dd className="inline text-muted-foreground">{x.outcome}</dd></div></dl></div>
            ))}</div>
          </section>

          <section className={`${card} lg:col-span-2`}><Head title="Career Growth Roadmap"><Compass className="h-4 w-4 text-primary" /></Head>
            <ol className="grid gap-3 md:grid-cols-4">{r.roadmap.map((s, i) => (
              <li key={s.role + i} className={`rounded-xl border p-4 ${s.current ? "border-primary bg-primary-soft/40" : "border-border"}`}>
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">{s.current ? "Current role" : i === 1 ? "Suggested next role" : "Future role"}</p>
                <p className="font-display font-bold">{s.role}</p>
                <p className="mt-1 text-xs">Estimated readiness: <b>{s.readiness}%</b></p>
                {!s.current && <><p className="mt-2 text-[11px] font-semibold uppercase text-muted-foreground">Skills needed</p><Chips items={s.skills} /><p className="mt-2 text-[11px] font-semibold uppercase text-muted-foreground">Technologies needed</p><Chips items={s.technologies} /></>}
              </li>
            ))}</ol>
            <p className="mt-3 text-xs text-muted-foreground">Each step assumes ~15 points less readiness than the one before until you close the listed gaps.</p>
          </section>

          <section className={card}><Head title="Top Job Opportunities" />
            {r.topMatches.length ? <ul className="space-y-2">{r.topMatches.map((m) => <li key={m.jobId} className="flex items-center justify-between gap-2 text-sm"><div className="min-w-0"><Link to="/candidate/jobs/$id" params={{ id: m.jobId }} className="block truncate font-semibold hover:text-primary">{d.jobInfo[m.jobId]?.title}</Link><span className="text-xs text-muted-foreground">{d.jobInfo[m.jobId]?.company}</span></div><MatchBadge score={m.overall} /></li>)}</ul> : <p className="text-sm text-muted-foreground">No job matches yet.</p>}
            {r.techGaps[0] && <p className="mt-3 text-xs text-muted-foreground">Fastest improvement: adding <b>{r.techGaps[0].name}</b> lifts your average match ~{r.techGaps[0].impact}%.</p>}
          </section>

          <section className={card}><Head title="Career Trend"><TrendingUp className="h-4 w-4 text-primary" /></Head>
            {d.history.length < 2 ? <p className="text-sm text-muted-foreground">Your history starts today ({r.readiness.score} readiness). Check back after updating your profile to see your progress.</p> : (() => { const a = d.history[0]!, b = d.history[d.history.length - 1]!; const delta = (x: number | null, y: number | null) => (x == null || y == null ? "—" : `${Number(y) - Number(x) >= 0 ? "+" : ""}${Math.round(Number(y) - Number(x))}`); return (
              <>
                <div className="flex h-20 items-end gap-1">{d.history.map((h) => <div key={h.snapshot_date} title={`${h.snapshot_date}: ${h.readiness_score}`} className="flex-1 rounded-t bg-gradient-primary" style={{ height: `${Math.max(4, Number(h.readiness_score))}%` }} />)}</div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">{([["Readiness", delta(a.readiness_score, b.readiness_score)], ["Avg match", delta(a.average_match, b.average_match)], ["Profile strength", delta(a.profile_completion, b.profile_completion)], ["Skills added", delta(a.skill_count, b.skill_count)], ["Technologies added", delta(a.technology_count, b.technology_count)]] as const).map(([l, v]) => <div key={l} className="rounded-lg bg-muted/60 p-2"><p className="font-bold">{v}</p><p className="text-muted-foreground">{l}</p></div>)}</div>
                <p className="mt-2 text-[11px] text-muted-foreground">Since {a.snapshot_date}</p>
              </>); })()}
          </section>
        </div>
      ); }}</Wrap>
    </div>
  );
}
