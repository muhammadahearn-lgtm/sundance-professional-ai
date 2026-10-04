import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bookmark, BookmarkCheck, Building2, Check, ChevronDown, Clock, GitCompare, MapPin, Share2, Sparkles } from "lucide-react";
import type { JobCardRow } from "@/lib/job-search-data";
import type { Taxonomy } from "@/lib/jobs-data";
import { plainPreview } from "@/lib/job-search";
import { matchTier } from "@/lib/match-engine";
import { card } from "@/components/profile/parts";
import { BrandImg } from "@/components/recruiter/shared";
import { ARRANGEMENT, EMPLOYMENT, formatSalary, lbl } from "@/components/jobs/shared";
import { shareJob, type JobLists } from "./useJobLists";
import { asDetails, type ScoreRow } from "@/components/match/Match";

export const postedAgo = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? "Today" : d === 1 ? "Yesterday" : d < 30 ? `${d} days ago` : new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export function CompanyLogo({ path, size = "h-12 w-12" }: { path: string | null | undefined; size?: string }) {
  return path ? <BrandImg path={path} alt="Company logo" className={`${size} shrink-0 rounded-xl object-cover`} /> : <div className={`grid ${size} shrink-0 place-items-center rounded-xl bg-primary-soft`}><Building2 className="h-5 w-5 text-primary" /></div>;
}

const act = "inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold hover:border-primary hover:text-primary";

const TONE = {
  success: { text: "text-success", bg: "bg-success/10", ring: "border-success/30", bar: "bg-success", stroke: "stroke-success" },
  primary: { text: "text-primary", bg: "bg-primary-soft", ring: "border-primary/30", bar: "bg-primary", stroke: "stroke-primary" },
  warning: { text: "text-warning", bg: "bg-warning/10", ring: "border-warning/30", bar: "bg-warning", stroke: "stroke-warning" },
  muted: { text: "text-muted-foreground", bg: "bg-muted", ring: "border-border", bar: "bg-muted-foreground", stroke: "stroke-muted-foreground" },
};

const RING_C = 2 * Math.PI * 42;

function MatchScoreBadge({ score, open, onToggle }: { score: number; open: boolean; onToggle: () => void }) {
  const s = Math.round(score), tier = matchTier(s), t = TONE[tier.tone];
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-24 w-24">
        <svg viewBox="0 0 96 96" className="h-24 w-24 -rotate-90" aria-hidden="true">
          <circle cx="48" cy="48" r="42" fill="none" strokeWidth="6" className="stroke-muted" />
          <circle cx="48" cy="48" r="42" fill="none" strokeWidth="6" strokeLinecap="round" className={t.stroke} strokeDasharray={`${(RING_C * s) / 100} ${RING_C}`} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-display text-2xl font-extrabold leading-none ${t.text}`}>{s}%</span>
          <button type="button" onClick={onToggle} aria-expanded={open} className="mt-0.5 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold text-primary hover:opacity-80">
            Detail<ChevronDown className={`h-3 w-3 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>
      <p className={`text-[11px] font-bold ${t.text}`}>{tier.label}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Match Score</p>
    </div>
  );
}

function MatchInsights({ row }: { row: ScoreRow | undefined }) {
  const d = row ? asDetails(row.details) : null;
  if (!row || !d) return null;
  const missing = [...d.missing.languages, ...d.missing.skills, ...d.missing.technologies];
  const bars: [string, number][] = [["Language Match", row.language_alignment_score], ["Skill Match", row.skill_alignment_score], ["Technology Match", row.technology_alignment_score], ["Experience Match", row.experience_alignment_score], ["Career Alignment", row.preference_alignment_score]];
  return (
    <div className="grid gap-3">
      <div className="space-y-2.5">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Match Summary</p>
        {bars.map(([l, v]) => <div key={l}><div className="flex justify-between text-xs"><span className="font-medium">{l}</span><span className="font-bold">{Math.round(Number(v))}%</span></div><div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-gradient-primary" style={{ width: `${Number(v)}%` }} /></div></div>)}
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-success">Why You Match</p>
        {d.strengths.length ? <ul className="mt-2 space-y-1 text-sm">{d.strengths.slice(0, 6).map((x) => <li key={x} className="flex gap-1.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{x}</li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No strengths recorded yet.</p>}
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-destructive">Match Gaps</p>
        {missing.length || d.experienceGap ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {missing.map((x) => <span key={x} className="rounded-full border border-destructive/30 bg-destructive/5 px-2.5 py-0.5 text-xs font-semibold text-destructive">{x}{d.missing.requiredMissing.includes(x) ? " · required" : ""}</span>)}
            {d.experienceGap > 0 && <span className="rounded-full border border-destructive/30 bg-destructive/5 px-2.5 py-0.5 text-xs font-semibold text-destructive">{d.experienceGap} more yr{d.experienceGap === 1 ? "" : "s"} experience</span>}
          </div>
        ) : <p className="mt-2 text-sm text-muted-foreground">No gaps — you cover every requirement.</p>}
      </div>
    </div>
  );
}

type ReqRow = { lookup_id: string; requirement_level: string };
const LEVEL_ORDER: Record<string, number> = { required: 0, preferred: 1, optional: 2 };
const BADGE = { primary: "bg-primary-soft text-primary border-primary/20", violet: "bg-violet/10 text-violet border-violet/20", teal: "bg-teal/10 text-teal border-teal/20" };

function ReqGroup({ title, rows, names, tone }: { title: string; rows: ReqRow[] | null | undefined; names: { id: string; name: string }[]; tone: keyof typeof BADGE }) {
  const list = [...(rows ?? [])].sort((a, b) => (LEVEL_ORDER[a.requirement_level] ?? 3) - (LEVEL_ORDER[b.requirement_level] ?? 3));
  if (!list.length) return null;
  const nm = (id: string) => names.find((n) => n.id === id)?.name ?? "Unknown";
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
      {list.slice(0, 3).map((r) => <span key={r.lookup_id} className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${BADGE[tone]}`}>{nm(r.lookup_id)}</span>)}
      {list.length > 3 && <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">+{list.length - 3} More</span>}
    </div>
  );
}

export function JobCard({ j, roleName, lists, onRemove, score, scoreRow, tax }: { j: JobCardRow; roleName?: string | undefined; lists: JobLists; onRemove?: () => void; score?: number | undefined; scoreRow?: ScoreRow | undefined; tax?: Taxonomy | undefined }) {
  const saved = lists.isSaved(j.job_id), compared = lists.isCompared(j.job_id);
  const salary = formatSalary(j.minimum_salary, j.maximum_salary, j.salary_currency);
  const effective = score ?? (scoreRow ? Number(scoreRow.overall_match_score) : undefined);
  const [open, setOpen] = useState(false);
  const hasInsights = !!scoreRow && !!asDetails(scoreRow.details);
  return (
    <article className={`${card} flex flex-col p-5 transition-shadow hover:shadow-md`}>
      <div className="flex gap-4">
        <CompanyLogo path={j.companies?.logo_url} />
        <div className="min-w-0 flex-1">
          <Link to="/candidate/jobs/$id" params={{ id: j.job_id }} className="font-display text-base font-bold leading-tight hover:text-primary">{j.job_title}</Link>
          <p className="text-sm font-medium">{j.companies?.company_name}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{j.location} · {lbl(ARRANGEMENT, j.work_arrangement)}</span>
            <span>{lbl(EMPLOYMENT, j.employment_type)}</span>
            <span>{j.minimum_years_experience}+ yrs{j.experience_level && ` · ${j.experience_level}`}</span>
            {roleName && <span className="rounded-full bg-primary-soft px-2 py-0.5 font-semibold text-primary">{roleName}</span>}
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{postedAgo(j.published_at ?? j.created_at)}</span>
          </div>
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{plainPreview(j.job_description)}</p>
          {tax && (
            <div className="mt-3 space-y-2">
              <ReqGroup title="Programming Languages" rows={j.job_languages} names={tax.languages} tone="primary" />
              <ReqGroup title="Technical Skills" rows={j.job_skills} names={tax.skills} tone="violet" />
              <ReqGroup title="Tools & Technologies" rows={j.job_technologies} names={tax.technologies} tone="teal" />
            </div>
          )}
        </div>
        <div className="flex w-28 shrink-0 flex-col items-center justify-start gap-1.5">
          {salary && <span className="max-w-full rounded-full bg-success/10 px-2.5 py-1 text-center text-[11px] font-bold leading-tight text-success">{salary}</span>}
          {effective != null && <MatchScoreBadge score={effective} open={open} onToggle={() => setOpen((o) => !o)} />}
        </div>
      </div>
      {effective != null && hasInsights && (
        <div className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
          <div className="overflow-hidden">
            <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4"><MatchInsights row={scoreRow} /></div>
          </div>
        </div>
      )}
      {effective == null && <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground"><Sparkles className="mr-1.5 inline h-4 w-4" />Match score unavailable — complete your profile to see how you match.</div>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link to="/candidate/jobs/$id" params={{ id: j.job_id }} className="rounded-xl bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90">View Job</Link>
        {onRemove ? <button onClick={onRemove} className={act}><BookmarkCheck className="h-4 w-4" />Remove</button>
          : <button onClick={() => lists.toggleSave(j.job_id)} aria-pressed={saved} className={`${act} ${saved ? "border-primary text-primary" : ""}`}>{saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}{saved ? "Saved" : "Save"}</button>}
        <button onClick={() => lists.toggleCompare(j.job_id)} aria-pressed={compared} className={`${act} ${compared ? "border-primary text-primary" : ""}`}><GitCompare className="h-4 w-4" />{compared ? "Comparing" : "Compare"}</button>
        <button onClick={() => shareJob(j.job_id, j.job_title)} className={act} aria-label="Share job"><Share2 className="h-4 w-4" /><span className="hidden sm:inline">Share</span></button>
      </div>
    </article>
  );
}

export function CompareTray({ lists }: { lists: JobLists }) {
  if (!lists.compareIds.length) return null;
  return (
    <div className="fixed inset-x-0 bottom-4 z-30 mx-auto flex w-fit items-center gap-3 rounded-full border border-border bg-card px-4 py-2 shadow-lg">
      <GitCompare className="h-4 w-4 text-primary" /><span className="text-sm font-semibold">{lists.compareIds.length} of 4 selected</span>
      <Link to="/candidate/jobs/compare" className="rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground">Compare</Link>
    </div>
  );
}
