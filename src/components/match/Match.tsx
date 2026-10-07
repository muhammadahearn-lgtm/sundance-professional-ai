import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { recalculateMatches } from "@/lib/match.functions";
import { MATCH_FILTERS, matchTier, type MatchDetails } from "@/lib/match-engine";
import { ALIGNMENT_LABEL, type LocationAlignment } from "@/lib/location";
import { EDU_ALIGNMENT_LABEL, type EducationAlignment } from "@/lib/education";

export type ScoreRow = {
  candidate_id: string; job_id: string; overall_match_score: number; language_alignment_score: number; skill_alignment_score: number;
  technology_alignment_score: number; experience_alignment_score: number; preference_alignment_score: number; details: unknown; calculated_date: string;
};
const COLS = "candidate_id, job_id, overall_match_score, language_alignment_score, skill_alignment_score, technology_alignment_score, experience_alignment_score, preference_alignment_score, details, calculated_date";

/** Candidate: own scores keyed by job. Recruiter: scores for their jobs (RLS decides). */
export function useScores(filter: { candidateId?: string | undefined; jobIds?: string[] | undefined }) {
  return useQuery({
    queryKey: ["match", filter.candidateId ?? "", (filter.jobIds ?? []).join(",")],
    queryFn: async () => {
      let q = supabase.from("match_scores").select(COLS).order("overall_match_score", { ascending: false });
      if (filter.candidateId) q = q.eq("candidate_id", filter.candidateId);
      if (filter.jobIds) { if (!filter.jobIds.length) return [] as ScoreRow[]; q = q.in("job_id", filter.jobIds); }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ScoreRow[];
    },
  });
}

function isAuthError(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  const status = (e as { status?: number } | null)?.status;
  return status === 401 || /unauthori[sz]ed|jwt|auth session/i.test(msg);
}

export function useRecalc() {
  const qc = useQueryClient();
  const fn = useServerFn(recalculateMatches);
  return useMutation({
    mutationFn: (jobId?: string) => fn({ data: { jobId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["match"] }),
  });
}

/** Recalculate once when a screen opens so scores reflect the latest profile and jobs. */
export function useAutoRecalc(enabled = true) {
  const r = useRecalc();
  const done = useRef(false);
  useEffect(() => {
    if (!enabled || done.current) return;
    done.current = true;
    r.mutate(undefined, {
      onError: async (e) => {
        // Stay quiet when the person just logged out mid-refresh.
        if (isAuthError(e)) return;
        const { data } = await supabase.auth.getSession();
        if (!data.session) return;
        toast.error("Unable to calculate match scores");
      },
    });
  }, [enabled, r]);
  return r;
}

/** 90%+ / 80%+ / 70%+ / 60%+ / All Matches. 0 = all. */
export function MatchFilter({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const opts: [number, string][] = [...MATCH_FILTERS.map((n): [number, string] => [n, `${n}%+`]), [0, "All Matches"]];
  return <div className="flex flex-wrap gap-1.5" role="group" aria-label="Minimum match">{opts.map(([n, l]) => <button key={n} type="button" onClick={() => onChange(n)} aria-pressed={value === n} className={`rounded-full border px-2.5 py-1 text-xs font-medium ${value === n ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"}`}>{l}</button>)}</div>;
}

const toneCls = { success: "bg-success/15 text-success", primary: "bg-primary-soft text-primary", warning: "bg-warning/15 text-warning", muted: "bg-muted text-muted-foreground" };

export function MatchBadge({ score, showLabel = false }: { score: number | null | undefined; showLabel?: boolean }) {
  if (score == null) return <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground" title="Match Score Unavailable">— match</span>;
  const t = matchTier(Number(score));
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${toneCls[t.tone]}`} title={t.label}>{Math.round(Number(score))}%{showLabel && <span className="font-semibold">· {t.label}</span>}</span>;
}

const LOC_TONE: Record<LocationAlignment, string> = { strong: "bg-success/15 text-success", partial: "bg-warning/15 text-warning", conflict: "bg-destructive/10 text-destructive" };

/** Informational location fit chip — never part of the match score. */
export function LocationAlignmentBadge({ value }: { value: LocationAlignment }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${LOC_TONE[value]}`} title="Location fit is informational and never affects the match score."><MapPin className="h-3 w-3" />{ALIGNMENT_LABEL[value]}</span>;
}

function Bar({ label, v, weight }: { label: string; v: number; weight: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs"><span className="font-medium">{label} <span className="text-muted-foreground">({weight})</span></span><span className="font-semibold">{Math.round(v)}%</span></div>
      <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-gradient-primary" style={{ width: `${v}%` }} /></div>
    </div>
  );
}

export const asDetails = (d: unknown): MatchDetails => {
  const x = (d ?? {}) as Partial<MatchDetails>;
  return { strengths: x.strengths ?? [], missing: { languages: x.missing?.languages ?? [], skills: x.missing?.skills ?? [], technologies: x.missing?.technologies ?? [], requiredMissing: x.missing?.requiredMissing ?? [] }, experienceGap: x.experienceGap ?? 0, recommendations: x.recommendations ?? [] };
};

export function MatchPanel({ row, loading, onRecalc, recalculating, title = "Match Intelligence" }: { row: ScoreRow | null | undefined; loading?: boolean; onRecalc?: () => void; recalculating?: boolean; title?: string }) {
  const card = "rounded-2xl border border-border bg-card p-5 shadow-soft";
  const head = (
    <div className="flex items-center gap-2">
      <Sparkles className="h-4 w-4 text-primary" /><p className="font-display font-bold">{title}</p>
      {onRecalc && <button onClick={onRecalc} disabled={recalculating} aria-label="Recalculate match" className="ml-auto text-muted-foreground hover:text-primary disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${recalculating ? "animate-spin" : ""}`} /></button>}
    </div>
  );
  if (loading || recalculating && !row) return <div className={card}>{head}<div className="mt-4 h-32 animate-pulse rounded-xl bg-muted" /></div>;
  if (!row) return <div className={card}>{head}<p className="mt-3 text-sm text-muted-foreground">Match Score Unavailable. Complete your profile and recalculate.</p></div>;
  const d = asDetails(row.details);
  const missing = [...d.missing.languages, ...d.missing.skills, ...d.missing.technologies];
  return (
    <div className={card}>
      {head}
      <div className="mt-4 flex items-center gap-3"><span className="text-4xl font-extrabold">{Math.round(Number(row.overall_match_score))}%</span><MatchBadge score={row.overall_match_score} showLabel /></div>
      <div className="mt-4 space-y-3">
        <Bar label="Languages" v={Number(row.language_alignment_score)} weight="20%" />
        <Bar label="Skills" v={Number(row.skill_alignment_score)} weight="30%" />
        <Bar label="Technologies" v={Number(row.technology_alignment_score)} weight="20%" />
        <Bar label="Experience" v={Number(row.experience_alignment_score)} weight="20%" />
        <Bar label="Career preferences" v={Number(row.preference_alignment_score)} weight="10%" />
      </div>
      <details className="mt-4 rounded-xl bg-muted/50 p-3 text-sm" open>
        <summary className="cursor-pointer font-semibold">Why this score?</summary>
        {d.strengths.length > 0 && <><p className="mt-3 text-xs font-semibold uppercase tracking-wide text-success">Strengths</p><ul className="mt-1 space-y-0.5">{d.strengths.map((s) => <li key={s}>✓ {s}</li>)}</ul></>}
        {(missing.length > 0 || d.experienceGap > 0) && <><p className="mt-3 text-xs font-semibold uppercase tracking-wide text-destructive">Missing requirements</p><ul className="mt-1 space-y-0.5">{missing.map((s) => <li key={s}>• {s}{d.missing.requiredMissing.includes(s) ? " (required)" : ""}</li>)}{d.experienceGap > 0 && <li>• {d.experienceGap} more year{d.experienceGap === 1 ? "" : "s"} of experience</li>}</ul></>}
        {d.recommendations.length > 0 && <><p className="mt-3 text-xs font-semibold uppercase tracking-wide text-primary">Recommendations</p><ul className="mt-1 space-y-0.5">{d.recommendations.map((s) => <li key={s}>→ {s}</li>)}</ul></>}
      </details>
      <p className="mt-3 text-[11px] text-muted-foreground">Updated {new Date(row.calculated_date).toLocaleString()}</p>
    </div>
  );
}

const linkCls = "text-xs font-semibold text-primary hover:underline";

/** Candidate: top active jobs by match, with average, tier spread and most common gaps. */
export function CandidateMatchWidget({ uid, compact = false }: { uid: string; compact?: boolean }) {
  const r = useAutoRecalc();
  const q = useQuery({
    queryKey: ["match", "top-jobs", uid],
    queryFn: async () => {
      const { data, error } = await supabase.from("match_scores").select("job_id, overall_match_score, details, jobs!inner(job_title, job_status, companies(company_name))").eq("candidate_id", uid).eq("jobs.job_status", "active").order("overall_match_score", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const card = "rounded-2xl border border-border bg-card p-5 shadow-soft";
  const rows = q.data ?? [];
  const avg = rows.length ? Math.round(rows.reduce((s, x) => s + Number(x.overall_match_score), 0) / rows.length) : null;
  const tiers = [["90%+", 90], ["75–89%", 75], ["60–74%", 60], ["<60%", 0]].map(([l, min], i, arr) => ({ l: l as string, n: rows.filter((x) => Number(x.overall_match_score) >= (min as number) && (i === 0 || Number(x.overall_match_score) < (arr[i - 1]![1] as number))).length }));
  const gapCount: Record<string, number> = {};
  for (const x of rows) for (const g of asDetails(x.details).missing.requiredMissing) gapCount[g] = (gapCount[g] ?? 0) + 1;
  const gaps = Object.entries(gapCount).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return (
    <section className={card}>
      <div className="mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><h2 className="font-bold">{compact ? "Top Matching Jobs" : "Match Intelligence"}</h2>
        <button onClick={() => r.mutate(undefined, { onSuccess: () => toast.success("Profile Re-Evaluated") })} disabled={r.isPending} aria-label="Recalculate matches" className="ml-auto text-muted-foreground hover:text-primary disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${r.isPending ? "animate-spin" : ""}`} /></button></div>
      {q.isLoading ? <div className="h-24 animate-pulse rounded-xl bg-muted" /> : q.error ? <p className="text-sm text-destructive">Match Score Unavailable.</p> : rows.length === 0 ? <p className="text-sm text-muted-foreground">{r.isPending ? "Calculating matches…" : "No active jobs to match yet."}</p> : (
        <>
          {!compact && <div className="mb-3 grid grid-cols-2 gap-2 text-center text-xs"><div className="rounded-lg bg-muted/60 py-2"><div className="text-2xl font-extrabold">{avg}%</div><div className="text-muted-foreground">Average across {rows.length} job{rows.length === 1 ? "" : "s"}</div></div><div className="rounded-lg bg-muted/60 py-2"><div className="text-2xl font-extrabold">{Math.round(Number(rows[0]!.overall_match_score))}%</div><div className="text-muted-foreground">Highest match</div></div></div>}
          <ul className="space-y-2">{rows.slice(0, compact ? 5 : 3).map((x) => (
            <li key={x.job_id} className="flex items-center justify-between gap-2 text-sm"><div className="min-w-0"><Link to="/candidate/jobs/$id" params={{ id: x.job_id }} className="block truncate font-semibold hover:text-primary">{x.jobs.job_title}</Link><span className="text-xs text-muted-foreground">{x.jobs.companies?.company_name}</span></div><MatchBadge score={x.overall_match_score} /></li>
          ))}</ul>
          {!compact && <>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Match spread</p>
            <div className="mt-1 grid grid-cols-4 gap-1 text-center text-xs">{tiers.map((t) => <div key={t.l} className="rounded-lg bg-muted/60 py-1.5"><div className="font-bold">{t.n}</div><div className="text-muted-foreground">{t.l}</div></div>)}</div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">{["Recent Match Improvements", "Match Trend"].map((l) => <div key={l} className="rounded-lg border border-dashed border-border p-2"><p className="font-semibold">{l}</p><p className="text-muted-foreground">Coming Soon</p></div>)}</div>
            {gaps.length > 0 && <><p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Improve your match</p><ul className="mt-1 space-y-0.5 text-sm">{gaps.map(([g, n]) => <li key={g}>→ Add {g} <span className="text-xs text-muted-foreground">(required by {n} job{n === 1 ? "" : "s"})</span></li>)}</ul></>}
          </>}
          <Link to="/candidate/jobs" search={{ sort: "match" }} className={`${linkCls} mt-3 inline-block`}>See all matches</Link>
        </>
      )}
    </section>
  );
}

/** Recruiter: best candidate–job pairs across their jobs. */
export function RecruiterMatchWidget() {
  const r = useAutoRecalc();
  const q = useQuery({
    queryKey: ["match", "top-candidates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("match_scores").select("candidate_id, job_id, overall_match_score, jobs(job_title)").order("overall_match_score", { ascending: false }).limit(200);
      if (error) throw error;
      const rows = data ?? [];
      const firstPerJob = [...new Map([...rows].reverse().map((x) => [x.job_id, x.candidate_id] as const)).values()];
      const ids = [...new Set([...rows.slice(0, 20).map((x) => x.candidate_id), ...firstPerJob])];
      const names: Record<string, string> = {};
      if (ids.length) {
        const n = await supabase.rpc("candidate_names", { _ids: ids });
        for (const x of n.data ?? []) names[x.user_id] = `${x.first_name} ${x.last_name}`.trim();
      }
      return { rows, names };
    },
  });
  const card = "rounded-2xl border border-border bg-card p-5 shadow-soft";
  const rows = q.data?.rows ?? [];
  const avg = rows.length ? Math.round(rows.reduce((s, x) => s + Number(x.overall_match_score), 0) / rows.length) : null;
  const strong = rows.filter((x) => Number(x.overall_match_score) >= 75).length;
  return (
    <section className={card}>
      <div className="mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><h2 className="font-bold">Hiring Intelligence</h2>
        <button onClick={() => r.mutate(undefined, { onSuccess: () => toast.success("Scores Calculated") })} disabled={r.isPending} aria-label="Recalculate matches" className="ml-auto text-muted-foreground hover:text-primary disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${r.isPending ? "animate-spin" : ""}`} /></button></div>
      {q.isLoading ? <div className="h-24 animate-pulse rounded-xl bg-muted" /> : q.error ? <p className="text-sm text-destructive">Match Score Unavailable.</p> : rows.length === 0 ? <p className="text-sm text-muted-foreground">{r.isPending ? "Calculating matches…" : "Publish a job to see matching candidates."}</p> : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2 text-center text-xs"><div className="rounded-lg bg-muted/60 py-2"><div className="text-lg font-bold">{avg}%</div><div className="text-muted-foreground">Average match</div></div><div className="rounded-lg bg-muted/60 py-2"><div className="text-lg font-bold">{strong}</div><div className="text-muted-foreground">Strong matches (75%+)</div></div></div>
          <ul className="space-y-2">{rows.slice(0, 5).map((x) => (
            <li key={`${x.candidate_id}:${x.job_id}`} className="flex items-center justify-between gap-2 text-sm"><div className="min-w-0"><Link to="/recruiter/candidates/$id" params={{ id: x.candidate_id }} className="block truncate font-semibold hover:text-primary">{q.data?.names[x.candidate_id] ?? "Candidate"}</Link><span className="text-xs text-muted-foreground">for {x.jobs?.job_title}</span></div><MatchBadge score={x.overall_match_score} /></li>
          ))}</ul>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Best candidate per job</p>
          <ul className="mt-1 space-y-1.5">{[...new Map(rows.map((x) => [x.job_id, x] as const)).values()].filter((x, i, arr) => arr.findIndex((y) => y.job_id === x.job_id) === i).map((x) => rows.find((y) => y.job_id === x.job_id)!).slice(0, 5).map((x) => (
            <li key={x.job_id} className="flex items-center justify-between gap-2 text-sm"><span className="min-w-0 truncate"><span className="text-muted-foreground">{x.jobs?.job_title}:</span> <Link to="/recruiter/candidates/$id" params={{ id: x.candidate_id }} className="font-semibold hover:text-primary">{q.data?.names[x.candidate_id] ?? "Candidate"}</Link></span><MatchBadge score={x.overall_match_score} /></li>
          ))}</ul>
          <Link to="/recruiter/candidates" search={{ sort: "match" }} className={`${linkCls} mt-3 inline-block`}>Rank all candidates</Link>
        </>
      )}
    </section>
  );
}

const EDU_TONE: Record<EducationAlignment, string> = { meets: "bg-success/15 text-success", below: "bg-warning/15 text-warning", missing: "bg-muted text-muted-foreground" };
/** Informational education fit chip — never part of the match score. */
export function EducationAlignmentBadge({ value }: { value: EducationAlignment }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${EDU_TONE[value]}`} title="Education fit is informational and never affects the match score.">{EDU_ALIGNMENT_LABEL[value]}</span>;
}
