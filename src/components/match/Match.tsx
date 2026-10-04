import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { recalculateMatches } from "@/lib/match.functions";
import { matchTier, type MatchDetails } from "@/lib/match-engine";

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
    r.mutate(undefined, { onError: () => toast.error("Unable to calculate match scores") });
  }, [enabled, r]);
  return r;
}

const toneCls = { success: "bg-success/15 text-success", primary: "bg-primary-soft text-primary", warning: "bg-warning/15 text-warning", muted: "bg-muted text-muted-foreground" };

export function MatchBadge({ score, showLabel = false }: { score: number | null | undefined; showLabel?: boolean }) {
  if (score == null) return <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground" title="Match Score Unavailable">— match</span>;
  const t = matchTier(Number(score));
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${toneCls[t.tone]}`} title={t.label}>{Math.round(Number(score))}%{showLabel && <span className="font-semibold">· {t.label}</span>}</span>;
}

function Bar({ label, v, weight }: { label: string; v: number; weight: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs"><span className="font-medium">{label} <span className="text-muted-foreground">({weight})</span></span><span className="font-semibold">{Math.round(v)}%</span></div>
      <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-gradient-primary" style={{ width: `${v}%` }} /></div>
    </div>
  );
}

const asDetails = (d: unknown): MatchDetails => {
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
