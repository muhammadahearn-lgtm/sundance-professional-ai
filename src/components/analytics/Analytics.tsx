import { highestDegree } from "@/lib/education";
import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Bookmark, Briefcase, ChevronDown, ChevronRight, Clock, KanbanSquare, MessageSquare, Send, Sparkles, Target, TrendingUp, Users, Download, FileSpreadsheet, FileText, RefreshCw, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";
import { PageHeader } from "@/components/app/AppShell";
import {
  RANGES, avg, avgDaysToHire, byMonth, conversions, funnel, inWindow, matchDistribution, matchStats, messagingStats, notificationStats, pct, tally, toCsv, windowFor,
  type DateWindow, type RangeKey,
} from "@/lib/analytics";
import { loadCandidateAnalytics, loadRecruiterAnalytics, type CandidateAnalyticsData, type JobInfo, type RecruiterAnalyticsData } from "@/lib/analytics-data";

const card = "rounded-2xl border border-border bg-card p-5 shadow-soft";
const btn = "inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50";
const COLORS = ["var(--primary)", "var(--success)", "var(--warning)", "var(--destructive)", "var(--muted-foreground)", "var(--primary-glow, var(--primary))"];
const label = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// ---------- Shared UI ----------
type Filters = { range: RangeKey; from: string; to: string; role: string; industry: string; technology: string; skill: string; location: string; company: string };
const EMPTY: Filters = { range: "30d", from: "", to: "", role: "", industry: "", technology: "", skill: "", location: "", company: "" };
type FilterKey = "role" | "industry" | "technology" | "skill" | "location" | "company";

function FilterBar({ f, set, options, onRefresh, onCsv, onExcel, refreshing }: {
  f: Filters; set: (f: Filters) => void; options: Partial<Record<FilterKey, string[]>>;
  onRefresh: () => void; onCsv: () => void; onExcel: () => void; refreshing: boolean;
}) {
  const [open, setOpen] = useState(false);
  const sel = "h-9 w-full rounded-lg border border-border bg-background px-2 text-sm";
  const active = (Object.keys(options) as FilterKey[]).filter((k) => f[k]).length;
  return (
    <div className={`${card} mb-5 space-y-3 p-4`}>
      <div className="flex flex-wrap items-center gap-2">
        <select className={`${sel} sm:w-44`} value={f.range} onChange={(e) => set({ ...f, range: e.target.value as RangeKey })} aria-label="Date range">
          {(Object.keys(RANGES) as RangeKey[]).map((r) => <option key={r} value={r}>{RANGES[r]}</option>)}
        </select>
        {f.range === "custom" && <>
          <DatePicker className="w-full sm:w-44" value={f.from} max={f.to || undefined} onChange={(v) => set({ ...f, from: v })} aria-label="From date" placeholder="From" />
          <DatePicker className="w-full sm:w-44" value={f.to} min={f.from || undefined} onChange={(v) => set({ ...f, to: v })} aria-label="To date" placeholder="To" />
        </>}
        <button className={btn} onClick={() => setOpen(!open)} aria-expanded={open}><SlidersHorizontal className="h-3.5 w-3.5" />Filters{active ? ` (${active})` : ""}<ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} /></button>
        <div className="ml-auto flex flex-wrap gap-2">
          <button className={btn} onClick={onRefresh} disabled={refreshing}><RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />Refresh</button>
          <button className={btn} onClick={onCsv}><Download className="h-3.5 w-3.5" />CSV</button>
          <button className={btn} onClick={onExcel}><FileSpreadsheet className="h-3.5 w-3.5" />Excel</button>
          <button className={btn} onClick={() => toast("PDF export is coming soon.")}><FileText className="h-3.5 w-3.5" />PDF</button>
        </div>
      </div>
      {open && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(options) as FilterKey[]).map((k) => (
            <select key={k} className={sel} value={f[k]} onChange={(e) => set({ ...f, [k]: e.target.value })} aria-label={label(k)}>
              <option value="">All {label(k) === "Industry" ? "Industries" : label(k) === "Technology" ? "Technologies" : `${label(k)}s`}</option>
              {(options[k] ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
          {active > 0 && <button className={btn} onClick={() => set({ ...EMPTY, range: f.range, from: f.from, to: f.to })}>Clear filters</button>}
        </div>
      )}
    </div>
  );
}

function Kpi({ n, l, hint }: { n: ReactNode; l: string; hint?: string | undefined }) {
  return <div className="rounded-2xl border border-border bg-card p-4 shadow-soft"><div className="text-2xl font-extrabold tracking-tight">{n}</div><div className="text-xs font-medium text-muted-foreground">{l}</div>{hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}</div>;
}
function Section({ title, children, desc }: { title: string; children: ReactNode; desc?: string | undefined }) {
  return <section className="space-y-3"><div><h2 className="text-lg font-bold">{title}</h2>{desc && <p className="text-xs text-muted-foreground">{desc}</p>}</div>{children}</section>;
}
function ChartCard({ title, children, empty }: { title: string; children: ReactNode; empty?: boolean | undefined }) {
  return <div className={card}><p className="mb-3 text-sm font-semibold">{title}</p>{empty ? <p className="grid h-48 place-items-center text-sm text-muted-foreground">No Data Available</p> : children}</div>;
}
function Bars({ data, unit = "", height = 220 }: { data: { name: string; value: number }[]; unit?: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
        <Tooltip formatter={(v) => `${v}${unit}`} contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }} />
        <Bar dataKey="value" fill="var(--primary)" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
function Trend({ data, keys, height = 220 }: { data: Record<string, string | number | null>[]; keys: { k: string; name: string }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ left: -16, right: 8 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="x" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }} />
        {keys.map((k, i) => <Line key={k.k} type="monotone" dataKey={k.k} name={k.name} stroke={COLORS[i]} strokeWidth={2} dot={{ r: 3 }} connectNulls />)}
      </LineChart>
    </ResponsiveContainer>
  );
}
function Donut({ data }: { data: { name: string; value: number }[] }) {
  const shown = data.filter((d) => d.value > 0);
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row">
      <ResponsiveContainer width="100%" height={200} className="max-w-[220px]">
        <PieChart><Pie data={shown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>{shown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart>
      </ResponsiveContainer>
      <ul className="space-y-1 text-sm">{shown.map((d, i) => <li key={d.name} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{d.name}<b className="ml-auto pl-4">{d.value}</b></li>)}</ul>
    </div>
  );
}
function Funnel({ data }: { data: { name: string; value: number }[] }) {
  const max = Math.max(1, data[0]?.value ?? 1);
  return (
    <div className="space-y-1.5">
      {data.map((d, i) => (
        <div key={d.name} className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-xs font-medium text-muted-foreground">{d.name}</span>
          <div className="relative h-8 flex-1">
            <div className="mx-auto flex h-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground transition-all" style={{ width: `${Math.max(8, (d.value / max) * 100)}%`, opacity: 1 - i * 0.12 }}>{d.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
function Rates({ data }: { data: { name: string; value: number }[] }) {
  return <div className="space-y-3">{data.map((r) => <div key={r.name}><div className="mb-1 flex justify-between text-xs"><span>{r.name}</span><b>{r.value}%</b></div><div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${r.value}%` }} /></div></div>)}</div>;
}
function Stat({ items }: { items: [string, ReactNode][] }) {
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{items.map(([l, v]) => <div key={l} className="rounded-xl bg-muted/50 px-3 py-2"><div className="text-lg font-extrabold">{v}</div><div className="text-[11px] text-muted-foreground">{l}</div></div>)}</div>;

// ---------- AI-vibe layout helpers ----------
function Tabs<T extends string>({ tabs, value, onChange }: { tabs: [T, string, typeof BarChart3][]; value: T; onChange: (t: T) => void }) {
  return (
    <div role="tablist" className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card/70 p-1 shadow-soft backdrop-blur">
      {tabs.map(([k, l, Icon]) => (
        <button key={k} role="tab" aria-selected={value === k} onClick={() => onChange(k)}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${value === k ? "bg-gradient-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-primary-soft hover:text-primary"}`}>
          <Icon className="h-4 w-4" />{l}
        </button>
      ))}
    </div>
  );
}
function AiBrief({ points }: { points: string[] }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary-soft via-card to-card p-6 shadow-soft">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-card/70 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-primary" /></span>
          AI Briefing
        </span>
        <ul className="mt-3 space-y-2">{points.map((p) => <li key={p} className="flex gap-2 text-sm"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{p}</li>)}</ul>
      </div>
    </section>
  );
}
function HeroKpi({ Icon, n, l, hint }: { Icon: typeof BarChart3; n: ReactNode; l: string; hint?: string | undefined }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5">
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/10 blur-2xl" />
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-soft"><Icon className="h-4 w-4" /></span>
      <div className="mt-3 text-3xl font-extrabold tracking-tight">{n}</div>
      <div className="text-sm font-medium text-muted-foreground">{l}</div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
function FunnelStrip({ steps }: { steps: { name: string; value: number }[] }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
      {steps.map((s, i) => (
        <div key={s.name} className="flex flex-1 items-center gap-2">
          <div className={`flex-1 rounded-xl border px-3 py-3 text-center ${s.value ? "border-primary/30 bg-primary-soft" : "border-border bg-muted/40"}`}>
            <div className={`text-2xl font-extrabold ${s.value ? "text-primary" : "text-muted-foreground"}`}>{s.value}</div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{s.name}</div>
          </div>
          {i < steps.length - 1 && <ChevronRight className="hidden h-4 w-4 shrink-0 text-primary/50 sm:block" />}
        </div>
      ))}
    </div>
  );
}
function Ring({ v, l }: { v: number; l: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-16 w-16 rounded-full" style={{ background: `conic-gradient(var(--primary) ${Math.min(100, v) * 3.6}deg, var(--muted) 0deg)` }}>
        <div className="absolute inset-1.5 flex items-center justify-center rounded-full bg-card text-sm font-extrabold text-primary">{v}%</div>
      </div>
      <span className="text-sm font-semibold">{l}</span>
    </div>
  );
}
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click(); URL.revokeObjectURL(url);
}
type Sheet = { name: string; rows: Record<string, string | number | null | undefined>[] };
function exportCsv(file: string, sheets: Sheet[]) {
  try {
    download(`${file}.csv`, sheets.filter((s) => s.rows.length).map((s) => `${s.name}\n${toCsv(s.rows)}`).join("\n\n"));
    toast.success("Export Completed");
  } catch { toast.error("Export Failed"); }
}
async function exportExcel(file: string, sheets: Sheet[]) {
  try {
    const { default: writeXlsxFile } = await import("write-excel-file/browser");
    const data = sheets.filter((s) => s.rows.length).map((s) => {
      const cols = Object.keys(s.rows[0]!);
      return { sheet: s.name.slice(0, 31), data: [cols.map((c) => ({ value: c, fontWeight: "bold" as const })), ...s.rows.map((r) => cols.map((c) => (r[c] == null ? null : { value: r[c] as string | number })))] };
    });
    if (!data.length) { toast("No Data Available"); return; }
    await writeXlsxFile(data).toFile(`${file}.xlsx`);
    toast.success("Export Completed");
  } catch { toast.error("Export Failed"); }
}

function useWindow(f: Filters): DateWindow {
  return useMemo(() => windowFor(f.range, new Date(), { from: f.from, to: f.to }), [f.range, f.from, f.to]);
}
const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort();
function jobMatches(j: JobInfo | undefined, f: Filters) {
  const set = f.role || f.industry || f.technology || f.skill || f.location || f.company;
  if (!set) return true;
  if (!j) return false;
  return (!f.role || j.role === f.role || j.job_title === f.role) && (!f.industry || j.industry === f.industry)
    && (!f.technology || j.technologies.includes(f.technology)) && (!f.skill || j.skills.includes(f.skill))
    && (!f.location || j.location === f.location) && (!f.company || j.company === f.company);
}
const groupAvg = (rows: { k: string[]; v: number }[], limit = 6) => {
  const m = new Map<string, number[]>();
  for (const r of rows) for (const k of r.k) if (k) m.set(k, [...(m.get(k) ?? []), r.v]);
  return [...m.entries()].map(([name, vs]) => ({ name, value: avg(vs) })).sort((a, b) => b.value - a.value).slice(0, limit);
};
const monthKey = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

function Shell({ title, subtitle, q, children }: { title: string; subtitle: string; q: { isLoading: boolean; error: unknown; refetch: () => unknown }; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={title} subtitle={subtitle} />
      {q.error ? <div className={`${card} p-10 text-center`}><p className="font-semibold text-destructive">Unable To Load Analytics</p><button className={`${btn} mt-3`} onClick={() => void q.refetch()}>Try again</button></div>
        : q.isLoading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{Array.from({ length: 10 }, (_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)}</div>
        : children}
    </div>
  );
}
async function refresh(q: { refetch: () => Promise<{ error: unknown }> }) {
  const r = await q.refetch();
  if (r.error) toast.error("Connection Error"); else toast.success("Metrics Refreshed");
}

// ---------- Candidate ----------
export function useCandidateAnalytics(uid: string) {
  return useQuery({ queryKey: ["analytics", "candidate", uid], queryFn: () => loadCandidateAnalytics(uid), staleTime: 60_000 });
}

function candidateMetrics(d: CandidateAnalyticsData, f: Filters, w: DateWindow, uid: string) {
  const ok = (jobId: string) => jobMatches(d.jobs[jobId], f);
  const apps = d.apps.filter((a) => ok(a.job_id) && inWindow(a.application_date, w));
  const has = (...s: string[]) => apps.filter((a) => s.includes(a.application_status)).length;
  const scores = d.scores.filter((s) => ok(s.job_id) && d.jobs[s.job_id]?.job_status === "active").map((s) => Number(s.overall_match_score));
  const snaps = d.snapshots.filter((s) => inWindow(`${s.snapshot_date}T12:00:00`, w));
  const last = d.snapshots[d.snapshots.length - 1];
  const saved = d.saved.filter((s) => ok(s.job_id) && inWindow(s.saved_date, w));
  const ev = (t: string) => new Set(d.events.filter((e) => e.event_type === t && ok(e.entity_id) && inWindow(e.created_at, w)).map((e) => e.entity_id));
  const viewed = ev("job_view"), recViewed = ev("recommendation_view"), recClicked = ev("recommendation_click");
  const appliedJobs = new Set(d.apps.map((a) => a.job_id));
  const recApplied = [...recClicked].filter((id) => appliedJobs.has(id)).length;
  const added = (rows: { created_at: string }[]) => rows.filter((r) => inWindow(r.created_at, w)).length;
  const stats = matchStats(scores);
  const kpis = {
    submitted: apps.length, viewed: apps.length - has("applied"), contacts: has("recruiter_contacted", "interviewing", "offer", "hired"),
    interviews: has("interviewing", "offer", "hired"), offers: has("offer", "hired"), hires: has("hired"),
    avgMatch: stats.average, readiness: last ? Math.round(Number(last.readiness_score)) : 0, completion: last ? Math.round(Number(last.profile_completion)) : 0, saved: saved.length,
  };
  const jobOf = (id: string) => d.jobs[id];
  return {
    kpis, apps, stats, scores, snaps,
    byMonth: byMonth(apps.map((a) => a.application_date)),
    byStatus: tally(apps, (a) => label(a.application_status)),
    byRole: tally(apps, (a) => jobOf(a.job_id)?.role || jobOf(a.job_id)?.job_title),
    byCompany: tally(apps, (a) => jobOf(a.job_id)?.company),
    byLocation: tally(apps, (a) => jobOf(a.job_id)?.location),
    byArrangement: tally(apps, (a) => label(jobOf(a.job_id)?.work_arrangement ?? "")),
    topRoles: groupAvg(d.scores.filter((s) => ok(s.job_id)).map((s) => ({ k: [jobOf(s.job_id)?.role || jobOf(s.job_id)?.job_title || ""], v: Number(s.overall_match_score) }))),
    topIndustries: groupAvg(d.scores.filter((s) => ok(s.job_id)).map((s) => ({ k: [jobOf(s.job_id)?.industry ?? ""], v: Number(s.overall_match_score) }))),
    topTech: groupAvg(d.scores.filter((s) => ok(s.job_id)).map((s) => ({ k: jobOf(s.job_id)?.technologies ?? [], v: Number(s.overall_match_score) }))),
    topLocations: groupAvg(d.scores.filter((s) => ok(s.job_id)).map((s) => ({ k: [jobOf(s.job_id)?.location ?? ""], v: Number(s.overall_match_score) }))),
    added: { skills: added(d.skills), technologies: added(d.technologies), certifications: added(d.certifications), experience: added(d.experience) },
    growth: byMonth([]).map((m, i) => ({
      x: m.month,
      Skills: byMonth(d.skills.map((r) => r.created_at))[i]!.count, Technologies: byMonth(d.technologies.map((r) => r.created_at))[i]!.count,
      Experience: byMonth(d.experience.map((r) => r.created_at))[i]!.count, Certifications: byMonth(d.certifications.map((r) => r.created_at))[i]!.count,
    })),
    readinessChange: snaps.length >= 2 ? Math.round(Number(snaps[snaps.length - 1]!.readiness_score) - Number(snaps[0]!.readiness_score)) : null,
    search: { viewed: viewed.size, saved: saved.length, applied: apps.length, conversion: pct([...viewed].filter((id) => appliedJobs.has(id)).length, viewed.size), savedConversion: pct(saved.filter((s) => appliedJobs.has(s.job_id)).length, saved.length) },
    recs: { viewed: recViewed.size, clicked: recClicked.size, applied: recApplied, success: pct(recApplied, recViewed.size) },
    messaging: messagingStats(d.messages.filter((m) => inWindow(m.created_at, w)), uid),
    notifs: notificationStats(d.notifications.filter((n) => inWindow(n.created_at, w))),
  };
}

export function CandidateAnalyticsPage({ uid }: { uid: string }) {
  const q = useCandidateAnalytics(uid);
  const [f, setF] = useState<Filters>(EMPTY);
  const [tab, setTab] = useState<"overview" | "applications" | "match" | "growth">("overview");
  const w = useWindow(f);
  const m = useMemo(() => (q.data ? candidateMetrics(q.data, f, w, uid) : null), [q.data, f, w, uid]);
  const jobs = Object.values(q.data?.jobs ?? {});
  const options = { role: uniq(jobs.map((j) => j.role || j.job_title)), industry: uniq(jobs.map((j) => j.industry)), technology: uniq(jobs.flatMap((j) => j.technologies)), skill: uniq(jobs.flatMap((j) => j.skills)), location: uniq(jobs.map((j) => j.location)), company: uniq(jobs.map((j) => j.company)) };
  const sheets = (): Sheet[] => !m || !q.data ? [] : [
    { name: "KPIs", rows: Object.entries(m.kpis).map(([k, v]) => ({ metric: label(k.replace(/([A-Z])/g, "_$1")), value: v })) },
    { name: "Applications", rows: m.apps.map((a) => ({ job: q.data.jobs[a.job_id]?.job_title ?? "", company: q.data.jobs[a.job_id]?.company ?? "", status: label(a.application_status), applied: a.application_date.slice(0, 10) })) },
    { name: "Applications By Month", rows: m.byMonth },
  ];
  return (
    <Shell title="Analytics" subtitle="How your job search is performing, and where to focus next." q={q}>
      {m && <>
        <FilterBar f={f} set={setF} options={options} refreshing={q.isFetching} onRefresh={() => void refresh(q)} onCsv={() => exportCsv("sundance-candidate-analytics", sheets())} onExcel={() => void exportExcel("sundance-candidate-analytics", sheets())} />
        <Tabs tabs={[["overview", "Overview", Sparkles], ["applications", "Applications", Send], ["match", "Match Intelligence", Target], ["growth", "Growth & Activity", TrendingUp]]} value={tab} onChange={setTab} />
        {tab === "overview" && <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2"><AiBrief points={[
              m.kpis.submitted ? `You've sent ${m.kpis.submitted} application${m.kpis.submitted === 1 ? "" : "s"} in this period; ${m.kpis.interviews} reached interviews.` : "No applications in this period yet — your highest matches are a great place to start.",
              m.topRoles[0] ? `Your strongest fit is ${m.topRoles[0].name} roles, averaging a ${m.topRoles[0].value}% match.` : "Add more skills and tools to unlock role-level match insights.",
              m.kpis.completion < 100 ? `Your profile is ${m.kpis.completion}% complete — finishing it improves how recruiters find you.` : "Your profile is complete — recruiters see your full picture.",
            ]} /></div>
            <div className={`${card} flex flex-col justify-center gap-4`}><Ring v={m.kpis.avgMatch} l="Average Match" /><Ring v={m.kpis.completion} l="Profile Completion" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <HeroKpi Icon={Send} n={m.kpis.submitted} l="Applications" /><HeroKpi Icon={MessageSquare} n={`${m.messaging.responseRate}%`} l="Response Rate" />
            <HeroKpi Icon={Target} n={m.kpis.readiness} l="Career Readiness" /><HeroKpi Icon={Bookmark} n={m.kpis.saved} l="Saved Jobs" />
          </div>
          <Section title="Your Application Journey"><div className={card}><FunnelStrip steps={[{ name: "Applied", value: m.kpis.submitted }, { name: "Viewed", value: m.kpis.viewed }, { name: "Contacted", value: m.kpis.contacts }, { name: "Interviews", value: m.kpis.interviews }, { name: "Offers", value: m.kpis.offers }, { name: "Hired", value: m.kpis.hires }]} /></div></Section>
        </div>}
        {tab === "applications" && <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Applications By Month" empty={!m.apps.length}><Trend data={m.byMonth.map((b) => ({ x: b.month, Applications: b.count }))} keys={[{ k: "Applications", name: "Applications" }]} /></ChartCard>
          <ChartCard title="Applications By Status" empty={!m.apps.length}><Donut data={m.byStatus} /></ChartCard>
          <ChartCard title="Applications By Role" empty={!m.apps.length}><Bars data={m.byRole} /></ChartCard>
          <ChartCard title="Applications By Company" empty={!m.apps.length}><Bars data={m.byCompany} /></ChartCard>
          <ChartCard title="Applications By Location" empty={!m.apps.length}><Bars data={m.byLocation} /></ChartCard>
          <ChartCard title="Applications By Work Arrangement" empty={!m.apps.length}><Donut data={m.byArrangement} /></ChartCard>
        </div>}
        {tab === "match" && <div className="space-y-4">
          <Stat items={[["Average Match", `${m.stats.average}%`], ["Highest Match", `${m.stats.highest}%`], ["Lowest Match", `${m.stats.lowest}%`], ["Jobs Scored", m.stats.count]]} />
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Match Score Trend" empty={!m.snaps.length}><Trend data={m.snaps.map((s) => ({ x: monthKey(`${s.snapshot_date}T12:00:00`), Match: s.average_match == null ? null : Math.round(Number(s.average_match)) }))} keys={[{ k: "Match", name: "Average match %" }]} /></ChartCard>
            <ChartCard title="Match Distribution" empty={!m.scores.length}><Bars data={matchDistribution(m.scores)} /></ChartCard>
            <ChartCard title="Top Matching Roles" empty={!m.topRoles.length}><Bars data={m.topRoles} unit="%" /></ChartCard>
            <ChartCard title="Top Matching Industries" empty={!m.topIndustries.length}><Bars data={m.topIndustries} unit="%" /></ChartCard>
            <ChartCard title="Top Matching Technologies" empty={!m.topTech.length}><Bars data={m.topTech} unit="%" /></ChartCard>
            <ChartCard title="Top Matching Locations" empty={!m.topLocations.length}><Bars data={m.topLocations} unit="%" /></ChartCard>
          </div>
        </div>}
        {tab === "growth" && <div className="space-y-6">
          <Stat items={[["Skills Added", m.added.skills], ["Technologies Added", m.added.technologies], ["Certifications Added", m.added.certifications], ["Readiness Change", m.readinessChange == null ? "—" : `${m.readinessChange > 0 ? "+" : ""}${m.readinessChange}`]]} />
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Career Readiness & Profile Completion Trend" empty={!m.snaps.length}><Trend data={m.snaps.map((s) => ({ x: monthKey(`${s.snapshot_date}T12:00:00`), Readiness: Math.round(Number(s.readiness_score)), Completion: Math.round(Number(s.profile_completion)) }))} keys={[{ k: "Readiness", name: "Readiness" }, { k: "Completion", name: "Profile completion %" }]} /></ChartCard>
            <ChartCard title="Skills, Technology, Experience & Certification Growth"><Trend data={m.growth} keys={[{ k: "Skills", name: "Skills" }, { k: "Technologies", name: "Technologies" }, { k: "Experience", name: "Experience" }, { k: "Certifications", name: "Certifications" }]} /></ChartCard>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Job Search"><Stat items={[["Jobs Viewed", m.search.viewed], ["Jobs Saved", m.search.saved], ["Jobs Applied", m.search.applied], ["Viewed → Applied", `${m.search.conversion}%`]]} /><p className="mt-3 text-xs text-muted-foreground">Saved job conversion: <b>{m.search.savedConversion}%</b> of saved jobs applied to.</p></ChartCard>
            <ChartCard title="Recommendations"><Stat items={[["Viewed", m.recs.viewed], ["Clicked", m.recs.clicked], ["Applied", m.recs.applied], ["Success Rate", `${m.recs.success}%`]]} /></ChartCard>
            <ChartCard title="Messaging"><Stat items={[["Messages Sent", m.messaging.sent], ["Messages Received", m.messaging.received], ["Response Rate", `${m.messaging.responseRate}%`], ["Avg Response", m.messaging.avgResponseHours == null ? "—" : `${m.messaging.avgResponseHours}h`]]} /></ChartCard>
            <ChartCard title="Notifications"><Stat items={[["Sent", m.notifs.sent], ["Opened", m.notifs.opened], ["Engagement", `${m.notifs.engagement}%`], ["Unopened", m.notifs.sent - m.notifs.opened]]} /></ChartCard>
          </div>
          <p className="text-xs text-muted-foreground">Job views and recommendation clicks are counted from Oct 2026 onward, once per job per day.</p>
        </div>}
      </>}
    </Shell>
  );
}

// ---------- Recruiter ----------
export function useRecruiterAnalytics(uid: string) {
  return useQuery({ queryKey: ["analytics", "recruiter", uid], queryFn: () => loadRecruiterAnalytics(uid), staleTime: 60_000 });
}

function recruiterMetrics(d: RecruiterAnalyticsData, f: Filters, w: DateWindow, uid: string) {
  const jobs = d.jobs.filter((j) => jobMatches(j, { ...f, skill: "" }));
  const jobIds = new Set(jobs.map((j) => j.job_id));
  const skillsOf = new Map<string, string[]>();
  for (const s of d.candidateSkills) skillsOf.set(s.candidate_id, [...(skillsOf.get(s.candidate_id) ?? []), s.technical_skills?.skill_name ?? ""]);
  const candOk = (c: string) => !f.skill || (skillsOf.get(c) ?? []).includes(f.skill);
  const apps = d.apps.filter((a) => jobIds.has(a.job_id) && candOk(a.candidate_id) && inWindow(a.application_date, w));
  const pipe = d.pipeline.filter((p) => (p.job_id ? jobIds.has(p.job_id) : !f.role && !f.location && !f.technology) && candOk(p.candidate_id) && inWindow(p.created_at, w));
  const scores = d.scores.filter((s) => jobIds.has(s.job_id) && candOk(s.candidate_id));
  // One funnel item per candidate–job pair
  const items = new Map<string, { status?: string | undefined; stage?: string | undefined; applied: boolean }>();
  for (const a of apps) items.set(`${a.candidate_id}|${a.job_id}`, { status: a.application_status, applied: true });
  for (const p of pipe) { const k = `${p.candidate_id}|${p.job_id ?? ""}`; items.set(k, { ...(items.get(k) ?? { applied: false }), stage: p.current_stage }); }
  const fun = funnel([...items.values()]);
  const conv = conversions(fun);
  const hires = d.pipeline.filter((p) => p.current_stage === "hired" && p.job_id && jobIds.has(p.job_id));
  const hirePairs = hires.map((h) => ({ applied: d.apps.find((a) => a.candidate_id === h.candidate_id && a.job_id === h.job_id)?.application_date ?? h.created_at, hired: h.stage_date })).filter((p) => inWindow(p.hired, w));
  const hired = fun[5]!.value;
  const stage = (s: string) => pipe.filter((p) => p.current_stage === s).length;
  const views = new Map(d.views.map((v) => [v.job_id, Number(v.views)]));
  const scoreOf = new Map(scores.map((s) => [`${s.candidate_id}|${s.job_id}`, Number(s.overall_match_score)]));
  const jobPerf = jobs.map((j) => {
    const ja = apps.filter((a) => a.job_id === j.job_id);
    const r = (...s: string[]) => ja.filter((a) => s.includes(a.application_status)).length;
    const appScores = ja.map((a) => scoreOf.get(`${a.candidate_id}|${a.job_id}`)).filter((x): x is number => x != null);
    return { job: j.job_title, status: label(j.job_status ?? ""), applications: ja.length, views: views.get(j.job_id) ?? 0, quality: appScores.length ? `${avg(appScores)}%` : "—", interviewRate: pct(r("interviewing", "offer", "hired"), ja.length), offerRate: pct(r("offer", "hired"), ja.length), hireRate: pct(r("hired"), ja.length) };
  });
  const recViewed = new Set(d.events.filter((e) => e.event_type === "recommendation_view" && inWindow(e.created_at, w)).map((e) => e.entity_id));
  const recClicked = new Set(d.events.filter((e) => e.event_type === "recommendation_click" && inWindow(e.created_at, w)).map((e) => e.entity_id));
  const contacted = new Set(d.contacted);
  const hiredCands = new Set(d.pipeline.filter((p) => p.current_stage === "hired").map((p) => p.candidate_id));
  const appliedPairs = new Set(d.apps.map((a) => `${a.candidate_id}|${a.job_id}`));
  const sources = tally([...items.entries()], ([k, v]) => v.applied || appliedPairs.has(k) ? "Applied" : recClicked.has(k.split("|")[0]!) ? "Recommendation" : "Talent Search");
  const best = [...scores].sort((a, b) => Number(b.overall_match_score) - Number(a.overall_match_score));
  const seen = new Set<string>();
  const topCands = best.filter((s) => d.names[s.candidate_id]).filter((s) => (seen.has(s.candidate_id) ? false : (seen.add(s.candidate_id), true))).slice(0, 5)
    .map((s) => ({ name: d.names[s.candidate_id] ?? "Candidate", job: d.jobs.find((j) => j.job_id === s.job_id)?.job_title ?? "", score: Math.round(Number(s.overall_match_score)) }));
  const candInScope = new Set([...apps.map((a) => a.candidate_id), ...pipe.map((p) => p.candidate_id)]);
  const profs = d.profiles.filter((p) => candInScope.has(p.user_id));
  const expBucket = (y: number) => (y < 2 ? "0–1 yrs" : y < 5 ? "2–4 yrs" : y < 8 ? "5–7 yrs" : y < 12 ? "8–11 yrs" : "12+ yrs");
  return {
    jobs, apps, pipe, fun, conv, jobPerf, topCands, sources,
    kpis: {
      active: jobs.filter((j) => j.job_status === "active").length, applications: apps.length, contacted: fun[1]!.value, interviewing: fun[2]!.value,
      offers: fun[4]!.value, hires: hired, avgMatch: avg(scores.map((s) => Number(s.overall_match_score))), conversion: conv[4]!.value, timeToHire: avgDaysToHire(hirePairs),
    },
    stages: ["saved", "contacted", "interviewing", "shortlisted", "offer", "hired", "rejected"].map((s) => ({ name: label(s), value: stage(s) })),
    appsPerHire: hired ? Math.round((apps.length / hired) * 10) / 10 : null,
    topJobs: [...jobPerf].sort((a, b) => b.hireRate - a.hireRate || b.interviewRate - a.interviewRate || b.applications - a.applications).slice(0, 5),
    availability: tally(profs, (p) => label(p.availability || "Not set")),
    appsByLocation: tally(apps, (a) => d.jobs.find((j) => j.job_id === a.job_id)?.location),
    candLocations: tally(profs, (p) => p.location),
    candDegrees: tally(profs, (p) => highestDegree(d.candidateEducation.filter((e) => e.candidate_id === p.user_id)) ?? "Not Listed"),
    candFields: tally(d.candidateEducation.filter((e) => candInScope.has(e.candidate_id) && e.field_of_study), (e) => e.field_of_study),
    experience: ["0–1 yrs", "2–4 yrs", "5–7 yrs", "8–11 yrs", "12+ yrs"].map((b) => ({ name: b, value: profs.filter((p) => expBucket(p.years_experience) === b).length })),
    skills: tally(d.candidateSkills.filter((s) => candInScope.has(s.candidate_id)), (s) => s.technical_skills?.skill_name),
    // Soft skills: informational only, never scored.
    softRequested: tally(jobs.flatMap((j) => j.softSkills ?? []), (s) => s),
    candidateSoft: tally(d.candidateSoftSkills.filter((s) => candInScope.has(s.candidate_id)), (s) => s.soft_skills?.soft_skill_name),
    distribution: matchDistribution(scores.map((s) => Number(s.overall_match_score))),
    recs: { viewed: recViewed.size, clicked: recClicked.size, contacted: [...recViewed].filter((c) => contacted.has(c)).length, hired: [...recViewed].filter((c) => hiredCands.has(c)).length },
    appsByMonth: byMonth(apps.map((a) => a.application_date)),
    messaging: messagingStats(d.messages.filter((m) => inWindow(m.created_at, w)), uid),
    notifs: notificationStats(d.notifications.filter((n) => inWindow(n.created_at, w))),
  };
}

export function RecruiterAnalyticsPage({ uid }: { uid: string }) {
  const q = useRecruiterAnalytics(uid);
  const [f, setF] = useState<Filters>(EMPTY);
  const [tab, setTab] = useState<"overview" | "pipeline" | "jobs" | "candidates">("overview");
  const w = useWindow(f);
  const m = useMemo(() => (q.data ? recruiterMetrics(q.data, f, w, uid) : null), [q.data, f, w, uid]);
  const options = q.data ? { role: uniq(q.data.jobs.map((j) => j.role || j.job_title)), location: uniq(q.data.jobs.map((j) => j.location)), technology: uniq(q.data.jobs.flatMap((j) => j.technologies)), skill: uniq(q.data.candidateSkills.map((s) => s.technical_skills?.skill_name ?? "")) } : {};
  const sheets = (): Sheet[] => !m ? [] : [
    { name: "KPIs", rows: Object.entries(m.kpis).map(([k, v]) => ({ metric: label(k.replace(/([A-Z])/g, "_$1")), value: v ?? "" })) },
    { name: "Job Performance", rows: m.jobPerf.map((j) => ({ ...j, interviewRate: `${j.interviewRate}%`, offerRate: `${j.offerRate}%`, hireRate: `${j.hireRate}%` })) },
    { name: "Funnel", rows: m.fun },
    { name: "Conversion", rows: m.conv.map((c) => ({ stage: c.name, rate: `${c.value}%` })) },
  ];
  const recRate = m ? pct(m.recs.contacted, m.recs.viewed) : 0;
  return (
    <Shell title="Analytics" subtitle="How effective your hiring process is, from first application to hire." q={q}>
      {m && <>
        <FilterBar f={f} set={setF} options={options} refreshing={q.isFetching} onRefresh={() => void refresh(q)} onCsv={() => exportCsv("sundance-hiring-analytics", sheets())} onExcel={() => void exportExcel("sundance-hiring-analytics", sheets())} />
        <Tabs tabs={[["overview", "Overview", Sparkles], ["pipeline", "Pipeline & Funnel", KanbanSquare], ["jobs", "Job Performance", Briefcase], ["candidates", "Candidate Quality", Users]]} value={tab} onChange={setTab} />
        {tab === "overview" && <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2"><AiBrief points={[
              m.kpis.applications ? `${m.kpis.applications} application${m.kpis.applications === 1 ? "" : "s"} across ${m.kpis.active} active job${m.kpis.active === 1 ? "" : "s"}; ${m.kpis.interviewing} candidate${m.kpis.interviewing === 1 ? " is" : "s are"} interviewing.` : `You have ${m.kpis.active} active job${m.kpis.active === 1 ? "" : "s"} and no applications in this period yet.`,
              m.topCands[0] ? `Your highest match is ${m.topCands[0].name} at ${m.topCands[0].score}% for ${m.topCands[0].job}.` : "Search talent to surface high-match candidates for your jobs.",
              m.topJobs[0] ? `${m.topJobs[0].job} is your top-performing job (${m.topJobs[0].applications} applications).` : "Publish a job to start tracking performance.",
            ]} /></div>
            <div className={`${card} flex flex-col justify-center gap-4`}><Ring v={m.kpis.avgMatch} l="Average Match" /><Ring v={m.kpis.conversion} l="Applications To Hire" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <HeroKpi Icon={Briefcase} n={m.kpis.active} l="Active Jobs" /><HeroKpi Icon={Send} n={m.kpis.applications} l="Applications" />
            <HeroKpi Icon={Clock} n={m.kpis.timeToHire == null ? "—" : `${m.kpis.timeToHire}d`} l="Time To Hire" /><HeroKpi Icon={Users} n={m.kpis.hires} l="Successful Hires" hint={m.appsPerHire ? `${m.appsPerHire} applications per hire` : undefined} />
          </div>
          <Section title="Hiring Journey"><div className={card}><FunnelStrip steps={m.fun} /></div></Section>
          <ChartCard title="Highest Match Candidates" empty={!m.topCands.length}><ul className="divide-y divide-border text-sm">{m.topCands.map((c, i) => <li key={i} className="flex items-center justify-between gap-2 py-2"><span className="truncate"><b>{c.name}</b> <span className="text-xs text-muted-foreground">· {c.job}</span></span><span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-bold text-primary">{c.score}%</span></li>)}</ul></ChartCard>
        </div>}
        {tab === "pipeline" && <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard title="Hiring Funnel" empty={!m.fun[0]!.value}><Funnel data={m.fun} /></ChartCard>
            <ChartCard title="Conversion Rates"><Rates data={m.conv} /></ChartCard>
            <ChartCard title="Pipeline By Stage" empty={!m.pipe.length}><Bars data={m.stages} /></ChartCard>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard title="Recommendations"><Stat items={[["Viewed", m.recs.viewed], ["Opened", m.recs.clicked], ["Contacted", m.recs.contacted], ["Hired", m.recs.hired]]} /><p className="mt-3 text-xs text-muted-foreground">Success rate (contacted ÷ recommended): <b>{recRate}%</b></p></ChartCard>
            <ChartCard title="Messaging"><Stat items={[["Sent", m.messaging.sent], ["Received", m.messaging.received], ["Response", `${m.messaging.responseRate}%`], ["Avg Reply", m.messaging.avgResponseHours == null ? "—" : `${m.messaging.avgResponseHours}h`]]} /><p className="mt-3 text-xs text-muted-foreground">{m.messaging.conversations} active conversations</p></ChartCard>
            <ChartCard title="Notifications"><Stat items={[["Sent", m.notifs.sent], ["Opened", m.notifs.opened], ["Engagement", `${m.notifs.engagement}%`], ["Unopened", m.notifs.sent - m.notifs.opened]]} /></ChartCard>
          </div>
          <p className="text-xs text-muted-foreground">Job views and recommendation activity are counted from Oct 2026 onward, once per person per day.</p>
        </div>}
        {tab === "jobs" && <div className="space-y-4">
          <div className={`${card} overflow-x-auto p-0`}>
            {!m.jobPerf.length ? <p className="p-8 text-center text-sm text-muted-foreground">No Data Available</p> : (
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b border-border text-left text-xs text-muted-foreground"><tr>{["Job", "Status", "Applications", "Views", "Candidate Quality", "Interview Rate", "Offer Rate", "Hire Rate"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
                <tbody>{m.jobPerf.map((j, i) => <tr key={i} className="border-b border-border/60 last:border-0 hover:bg-primary-soft/40"><td className="px-4 py-3 font-medium">{j.job}</td><td className="px-4 py-3">{j.status}</td><td className="px-4 py-3">{j.applications}</td><td className="px-4 py-3">{j.views}</td><td className="px-4 py-3">{j.quality}</td><td className="px-4 py-3">{j.interviewRate}%</td><td className="px-4 py-3">{j.offerRate}%</td><td className="px-4 py-3">{j.hireRate}%</td></tr>)}</tbody>
              </table>
            )}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Applications Per Job" empty={!m.jobPerf.length}><Bars data={m.jobPerf.map((j) => ({ name: j.job, value: j.applications }))} /></ChartCard>
            <ChartCard title="Applications By Month" empty={!m.apps.length}><Trend data={m.appsByMonth.map((b) => ({ x: b.month, Applications: b.count }))} keys={[{ k: "Applications", name: "Applications" }]} /></ChartCard>
            <ChartCard title="Applications By Location" empty={!m.appsByLocation.length}><Bars data={m.appsByLocation} /></ChartCard>
            <ChartCard title="Top Candidate Sources" empty={!m.sources.length}><Donut data={m.sources} /></ChartCard>
          </div>
        </div>}
        {tab === "candidates" && <div className="space-y-6">
          <Section title="Fit & Experience"><div className="grid gap-4 lg:grid-cols-3">
            <ChartCard title="Match Distribution" empty={!m.distribution.some((x) => x.value)}><Bars data={m.distribution} /></ChartCard>
            <ChartCard title="Candidate Experience" empty={!m.experience.some((x) => x.value)}><Bars data={m.experience} /></ChartCard>
            <ChartCard title="Candidate Availability" empty={!m.availability.length}><Donut data={m.availability} /></ChartCard>
          </div></Section>
          <Section title="Skills"><div className="grid gap-4 lg:grid-cols-3">
            <ChartCard title="Candidate Skills" empty={!m.skills.length}><Bars data={m.skills} /></ChartCard>
            <ChartCard title="Most Requested Soft Skills" empty={!m.softRequested.length}><Bars data={m.softRequested} /></ChartCard>
            <ChartCard title="Most Common Candidate Soft Skills" empty={!m.candidateSoft.length}><Bars data={m.candidateSoft} /></ChartCard>
          </div></Section>
          <Section title="Background & Location"><div className="grid gap-4 lg:grid-cols-3">
            <ChartCard title="Candidate Locations" empty={!m.candLocations.length}><Bars data={m.candLocations} /></ChartCard>
            <ChartCard title="Candidate Education Levels" empty={!m.candDegrees.length}><Bars data={m.candDegrees} /></ChartCard>
            <ChartCard title="Candidate Fields Of Study" empty={!m.candFields.length}><Bars data={m.candFields} /></ChartCard>
          </div></Section>
        </div>}
      </>}
    </Shell>
  );
}

// ---------- Dashboard snapshots ----------
export function CandidateAnalyticsSnapshot({ uid }: { uid: string }) {
  const q = useCandidateAnalytics(uid);
  const m = useMemo(() => (q.data ? candidateMetrics(q.data, EMPTY, windowFor("30d"), uid) : null), [q.data, uid]);
  return (
    <section className={card}>
      <div className="mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /><h2 className="font-bold">Analytics Snapshot</h2><span className="text-xs text-muted-foreground">· last 30 days</span><Link to="/candidate/analytics" className="ml-auto text-xs font-semibold text-primary hover:underline">View analytics</Link></div>
      {q.error ? <p className="text-sm text-destructive">Unable To Load Analytics</p> : !m ? <div className="h-16 animate-pulse rounded-xl bg-muted" /> :
        <Stat items={[["Applications", m.kpis.submitted], ["Interviews", m.kpis.interviews], ["Avg Match", `${m.kpis.avgMatch}%`], ["Response Rate", `${m.messaging.responseRate}%`]]} />}
    </section>
  );
}

export function RecruiterAnalyticsSnapshot({ uid }: { uid: string }) {
  const q = useRecruiterAnalytics(uid);
  const m = useMemo(() => (q.data ? recruiterMetrics(q.data, EMPTY, windowFor("30d"), uid) : null), [q.data, uid]);
  return (
    <section className={card}>
      <div className="mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /><h2 className="font-bold">Hiring Analytics</h2><span className="text-xs text-muted-foreground">· last 30 days</span><Link to="/recruiter/analytics" className="ml-auto text-xs font-semibold text-primary hover:underline">View analytics</Link></div>
      {q.error ? <p className="text-sm text-destructive">Unable To Load Analytics</p> : !m ? <div className="h-16 animate-pulse rounded-xl bg-muted" /> :
        <Stat items={[["Applications", m.kpis.applications], ["Interviewing", m.kpis.interviewing], ["Hire Rate", `${m.kpis.conversion}%`], ["Time To Hire", m.kpis.timeToHire == null ? "—" : `${m.kpis.timeToHire}d`]]} />}
    </section>
  );
}

// ---------- Platform (admin placeholder) ----------
export function PlatformAnalyticsPlaceholder() {
  const groups: [string, string[]][] = [
    ["Marketplace Health", ["Total Candidates", "Total Recruiters", "Total Jobs", "Total Applications", "Total Hires", "Average Match Score", "Marketplace Growth"]],
    ["Trends", ["Candidate Growth", "Recruiter Growth", "Job Growth", "Application Growth", "Hiring Growth"]],
    ["Top Skills", ["Most Requested Skills", "Most Requested Technologies", "Most Requested Roles", "Highest Demand Roles", "Emerging Skills"]],
    ["Top Matches", ["Highest Match Scores", "Most Competitive Candidates", "Highest Quality Jobs", "Most Active Recruiters"]],
  ];
  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-8">
      <PageHeader title="Platform Analytics" subtitle="Marketplace-wide reporting for Sundance Professionals administrators." />
      <div className={`${card} mb-5 border-dashed text-center`}><p className="font-semibold">Admin access is coming soon</p><p className="mt-1 text-sm text-muted-foreground">These reports will be available once administrator accounts are introduced.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">{groups.map(([t, items]) => <div key={t} className={card}><p className="mb-2 font-bold">{t}</p><ul className="space-y-1 text-sm text-muted-foreground">{items.map((i) => <li key={i}>• {i}</li>)}</ul></div>)}</div>
    </div>
  );
}
