import type { EducationAlignment } from "@/lib/education";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bookmark, BookmarkCheck, Building2, Check, ChevronDown, Clock, GitCompare, MapPin, Share2, Sparkles } from "lucide-react";
import { Eye } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { JobCardRow } from "@/lib/job-search-data";
import type { Taxonomy } from "@/lib/jobs-data";
import { plainPreview } from "@/lib/job-search";
import { MATCH_WEIGHTS, matchTier } from "@/lib/match-engine";
import { matchSummary, nextSteps } from "@/lib/match-explain";
import { card } from "@/components/profile/parts";
import { BrandImg } from "@/components/recruiter/shared";
import { ARRANGEMENT, EMPLOYMENT, formatSalary, lbl } from "@/components/jobs/shared";
import { shareJob, type JobLists } from "./useJobLists";
import { asDetails, EducationAlignmentBadge, LocationAlignmentBadge, type ScoreRow } from "@/components/match/Match";
import type { LocationAlignment } from "@/lib/location";
import { Button } from "@/components/ui/button";

export const postedAgo = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? "Today" : d === 1 ? "Yesterday" : d < 30 ? `${d} days ago` : new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

/** Discreet badge shown to candidates when the hiring company is kept confidential. */
export function StealthBadge({ on }: { on: boolean | null | undefined }) {
  if (!on) return null;
  return <span title="The hiring company is kept confidential for now" className="ml-1.5 inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Confidential</span>;
}

export function CompanyLogo({ path, size = "h-12 w-12" }: { path: string | null | undefined; size?: string }) {
  return path ? <BrandImg path={path} alt="Company logo" className={`${size} shrink-0 rounded-xl object-cover`} /> : <div className={`grid ${size} shrink-0 place-items-center rounded-xl bg-primary-soft`}><Building2 className="h-5 w-5 text-primary" /></div>;
}

const act = "inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold hover:border-primary hover:text-primary";

const TONE = {
  success: { text: "text-success", bg: "bg-success/10", ring: "border-success/30", bar: "bg-success" },
  primary: { text: "text-primary", bg: "bg-primary-soft", ring: "border-primary/30", bar: "bg-primary" },
  warning: { text: "text-warning", bg: "bg-warning/10", ring: "border-warning/30", bar: "bg-warning" },
  muted: { text: "text-muted-foreground", bg: "bg-muted", ring: "border-border", bar: "bg-muted-foreground" },
};

/** Soft category tints instead of solid fills: quiet, readable, same language as the skill chips. */
const softTone = (s: number) => s >= 90 ? "border-success/30 bg-success/10 text-success" : s >= 75 ? "border-primary/30 bg-primary-soft text-primary" : s >= 60 ? "border-warning/30 bg-warning/10 text-warning" : "border-border bg-muted text-muted-foreground";

/** 16px dial that fills with the match percentage — the "calculated score" cue. */
function ScoreRing({ s }: { s: number }) {
  const r = 6, c = 2 * Math.PI * r, pct = Math.min(100, Math.max(0, s));
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5 shrink-0 -rotate-90">
      <circle cx="8" cy="8" r={r} fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="2.5" />
      <circle cx="8" cy="8" r={r} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
    </svg>
  );
}

/** Compact soft-tinted match badge with a score ring; click opens a 5-factor breakdown popover (mirrors recruiter search). */
function MatchBadgePopover({ score, row }: { score: number | undefined; row: ScoreRow | undefined }) {
  if (score == null) return <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground" title="Complete your profile to see how you match"><Sparkles className="h-3.5 w-3.5" />No score yet</span>;
  const s = Math.round(score), tier = matchTier(s);
  const pill = <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums ${softTone(s)}`}><ScoreRing s={s} />{s}% Match</span>;
  if (!row) return pill;
  const bars: [string, number, number][] = [["Skills", row.skill_alignment_score, MATCH_WEIGHTS.skills], ["Languages", row.language_alignment_score, MATCH_WEIGHTS.languages], ["Tools & Tech", row.technology_alignment_score, MATCH_WEIGHTS.technologies], ["Experience", row.experience_alignment_score, MATCH_WEIGHTS.experience], ["Preferences", row.preference_alignment_score, MATCH_WEIGHTS.preferences]];
  return (
    <Popover>
      <PopoverTrigger asChild><button type="button" aria-label={`${s}% match — view breakdown`} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{pill}</button></PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="flex items-center justify-between"><p className="font-display text-sm font-bold">Match Breakdown</p><span className="text-xs font-semibold text-muted-foreground">{tier.label}</span></div>
        <div className="mt-3 space-y-2.5">
          {bars.map(([l, v, w]) => <div key={l}><div className="flex justify-between text-xs"><span className="font-medium">{l} <span className="text-muted-foreground">· {w}%</span></span><span className="font-bold">{Math.round(Number(v))}%</span></div><div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-gradient-primary" style={{ width: `${Number(v)}%` }} /></div></div>)}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MatchInsights({ row, open, locAlign, eduAlign }: { row: ScoreRow | undefined; open: boolean; locAlign?: LocationAlignment | undefined; eduAlign?: EducationAlignment | null | undefined }) {
  if (!row) return null;
  const d = asDetails(row.details);
  const req = new Set(d.missing.requiredMissing);
  const missing = [...d.missing.languages, ...d.missing.skills, ...d.missing.technologies].sort((a, b) => Number(req.has(b)) - Number(req.has(a)));
  const steps = nextSteps(d);
  const bars: [string, number, number][] = [["Skills", row.skill_alignment_score, MATCH_WEIGHTS.skills], ["Programming Languages", row.language_alignment_score, MATCH_WEIGHTS.languages], ["Tools & Technologies", row.technology_alignment_score, MATCH_WEIGHTS.technologies], ["Experience", row.experience_alignment_score, MATCH_WEIGHTS.experience], ["Preferences", row.preference_alignment_score, MATCH_WEIGHTS.preferences]];
  return (
    <div className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
      <div className="overflow-hidden">
        <div className="mt-3 space-y-4 border-t border-border pt-3">
          <p className="rounded-xl bg-primary-soft px-3 py-2 text-sm font-medium text-foreground"><Sparkles className="mr-1.5 inline h-4 w-4 text-primary" />{matchSummary(Math.round(Number(row.overall_match_score)), d)}</p>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-success">Why This Matches</p>
              {d.strengths.length ? <ul className="mt-2 space-y-1 text-sm">{d.strengths.slice(0, 6).map((x) => <li key={x} className="flex gap-1.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{x}</li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No strengths recorded yet.</p>}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-destructive">Areas To Improve</p>
              {missing.length || d.experienceGap ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {missing.map((x) => <span key={x} className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${req.has(x) ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-border bg-muted text-muted-foreground"}`}>{x} · {req.has(x) ? "Required" : "Preferred/Optional"}</span>)}
                  {d.experienceGap > 0 && <span className="rounded-full border border-destructive/30 bg-destructive/5 px-2.5 py-0.5 text-xs font-semibold text-destructive">{d.experienceGap} more yr{d.experienceGap === 1 ? "" : "s"} experience</span>}
                </div>
              ) : <p className="mt-2 text-sm text-muted-foreground">No gaps — you cover every requirement.</p>}
              {steps.length > 0 && <><p className="mt-3 text-xs font-bold uppercase tracking-wide text-primary">Next Steps</p><ul className="mt-1 space-y-1 text-sm">{steps.map((s) => <li key={s} className="flex gap-1.5"><span className="text-primary">→</span>{s}</li>)}</ul></>}
            </div>
            <div className="space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Score Breakdown</p>
              {bars.map(([l, v, w]) => <div key={l}><div className="flex justify-between text-xs"><span className="font-medium">{l} <span className="text-muted-foreground">· {w}% of score</span></span><span className="font-bold">{Math.round(Number(v))}%</span></div><div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-gradient-primary" style={{ width: `${Number(v)}%` }} /></div></div>)}
              {locAlign && <div className="pt-1"><p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Location Fit</p><LocationAlignmentBadge value={locAlign} /></div>}
              {eduAlign && <div className="pt-1"><p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Education Fit</p><EducationAlignmentBadge value={eduAlign} /></div>}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Education, soft skills, certifications and location fit are shown for context and don't change this score.</p>
        </div>
      </div>
    </div>
  );
}

type ReqRow = { lookup_id: string; requirement_level: string };
const LEVEL_ORDER: Record<string, number> = { required: 0, preferred: 1, optional: 2 };
type ReqCat = "languages" | "skills" | "technologies";
/** Category tones: violet = programming languages, indigo = technical skills, teal = tools & technologies. */
const CAT: Record<ReqCat, { label: string; solid: string; soft: string }> = {
  languages: { label: "Programming language", solid: "border-violet/30 bg-violet/10 text-violet", soft: "border-border/60 bg-muted/40 text-muted-foreground" },
  skills: { label: "Technical skill", solid: "border-indigo/30 bg-indigo/10 text-indigo", soft: "border-border/60 bg-muted/40 text-muted-foreground" },
  technologies: { label: "Tool / technology", solid: "border-teal/30 bg-teal/10 text-teal", soft: "border-border/60 bg-muted/40 text-muted-foreground" },
};
const CAT_ORDER: ReqCat[] = ["languages", "skills", "technologies"];

/** One fluid requirement row: languages, skills and technologies together, tinted by category, matched items first with a ✓. */
function Requirements({ rows, names, mine }: { rows: (ReqRow & { cat: ReqCat })[]; names: { id: string; name: string }[]; mine?: Set<string> | undefined }) {
  if (!rows.length) return null;
  const has = (r: ReqRow) => !!mine?.has(r.lookup_id);
  const list = [...rows].sort((a, b) => Number(has(b)) - Number(has(a)) || (LEVEL_ORDER[a.requirement_level] ?? 3) - (LEVEL_ORDER[b.requirement_level] ?? 3) || CAT_ORDER.indexOf(a.cat) - CAT_ORDER.indexOf(b.cat));
  const nm = (id: string) => names.find((n) => n.id === id)?.name ?? "Unknown";
  return (
    <div className="mt-4 flex flex-wrap gap-1.5">
      {list.slice(0, 8).map((r) => has(r)
        ? <span key={r.lookup_id} title={`${CAT[r.cat].label} · Matches your profile`} className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${CAT[r.cat].solid}`}>✓ {nm(r.lookup_id)}</span>
        : <span key={r.lookup_id} title={`${CAT[r.cat].label} · Not listed on your profile`} className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${CAT[r.cat].soft}`}>{nm(r.lookup_id)}</span>)}
      {list.length > 8 && <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">+{list.length - 8} More</span>}
    </div>
  );
}

/** Display-only soft skills; they never feed match scores, so they stay neutral and separate. */
function SoftGroup({ rows, names }: { rows: ReqRow[] | null | undefined; names: { id: string; name: string }[] }) {
  const list = rows ?? [];
  if (!list.length) return null;
  const nm = (id: string) => names.find((n) => n.id === id)?.name ?? "Unknown";
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Soft skills</span>
      {list.slice(0, 4).map((r) => <span key={r.lookup_id} title="Soft skill" className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{nm(r.lookup_id)}</span>)}
      {list.length > 4 && <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">+{list.length - 4} More</span>}
    </div>
  );
}

export function JobCard({ applied, onPreview, j, roleName, lists, onRemove, score, scoreRow, tax, locAlign, eduAlign, mine }: { applied?: string | undefined; onPreview?: ((id: string) => void) | undefined; mine?: Set<string> | undefined; j: JobCardRow; roleName?: string | undefined; lists: JobLists; onRemove?: () => void; score?: number | undefined; scoreRow?: ScoreRow | undefined; tax?: Taxonomy | undefined; locAlign?: LocationAlignment | undefined; eduAlign?: EducationAlignment | null | undefined }) {
  const [insightsOpen, setInsightsOpen] = useState(false);
  const saved = lists.isSaved(j.job_id), compared = lists.isCompared(j.job_id);
  const salary = formatSalary(j.minimum_salary, j.maximum_salary, j.salary_currency);
  return (
    <article className={`${card} p-5 transition-shadow hover:shadow-md`}>
      <div className="flex items-start gap-4">
        <CompanyLogo path={j.companies?.logo_url} />
        <div className="min-w-0 flex-1">
          <Link to="/candidate/jobs/$id" params={{ id: j.job_id }} className="font-display text-lg font-bold leading-tight hover:text-primary">{j.job_title}</Link>
          <p className="text-sm font-medium">{j.companies?.company_name}<StealthBadge on={j.is_confidential} /></p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{j.location} · {lbl(ARRANGEMENT, j.work_arrangement)}</span>
            <span>{lbl(EMPLOYMENT, j.employment_type)}</span>
            <span>{j.minimum_years_experience}+ yrs{j.experience_level && ` · ${j.experience_level}`}</span>
            {roleName && <span className="rounded-full bg-primary-soft px-2 py-0.5 font-semibold text-primary">{roleName}</span>}
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{postedAgo(j.published_at ?? j.created_at)}</span>
          </div>
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{plainPreview(j.job_description)}</p>
          {tax && (
            <>
              <Requirements
                rows={[
                  ...(j.job_languages ?? []).map((r) => ({ ...r, cat: "languages" as const })),
                  ...(j.job_skills ?? []).map((r) => ({ ...r, cat: "skills" as const })),
                  ...(j.job_technologies ?? []).map((r) => ({ ...r, cat: "technologies" as const })),
                ]}
                names={[...tax.languages, ...tax.skills, ...tax.technologies]}
                mine={mine}
              />
              <SoftGroup rows={j.job_soft_skills} names={tax.softSkills} />
            </>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <MatchBadgePopover score={score ?? (scoreRow ? Number(scoreRow.overall_match_score) : undefined)} row={scoreRow} />
          {salary && <span className="whitespace-nowrap rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-success">{salary}</span>}
        </div>
      </div>
      <MatchInsights row={scoreRow} open={insightsOpen} locAlign={locAlign} eduAlign={eduAlign} />
      <div className="mt-4 flex flex-wrap gap-2">
            {applied ? <Link to="/candidate/applications/$id" params={{ id: applied }} className="inline-flex items-center gap-1 rounded-xl border border-success/30 bg-success/10 px-3 py-1.5 text-sm font-semibold text-success hover:border-success/60">✓ Applied · View Application</Link>
              : <Link to="/candidate/jobs/$id" params={{ id: j.job_id }} className="rounded-xl border border-border px-3 py-1.5 text-sm font-semibold hover:border-primary hover:text-primary">View Job</Link>}
            {onPreview && <button onClick={() => onPreview(j.job_id)} className={act}><Eye className="h-4 w-4" />Quick View</button>}
            {onRemove ? <button onClick={onRemove} className={act}><BookmarkCheck className="h-4 w-4" />Remove</button>
              : <button onClick={() => lists.toggleSave(j.job_id)} aria-pressed={saved} className={`${act} ${saved ? "border-primary text-primary" : ""}`}>{saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}{saved ? "Saved" : "Save"}</button>}
            <button onClick={() => lists.toggleCompare(j.job_id)} aria-pressed={compared} className={`${act} ${compared ? "border-primary text-primary" : ""}`}><GitCompare className="h-4 w-4" />{compared ? "Comparing" : "Compare"}</button>
            <button onClick={() => shareJob(j.job_id, j.job_title)} className={act} aria-label="Share job"><Share2 className="h-4 w-4" /><span className="hidden sm:inline">Share</span></button>
            {scoreRow && <button onClick={() => setInsightsOpen((v) => !v)} aria-expanded={insightsOpen} className={`${act} ml-auto ${insightsOpen ? "border-primary text-primary" : ""}`}><Sparkles className="h-4 w-4" />Why this match<ChevronDown className={`h-3.5 w-3.5 transition-transform ${insightsOpen ? "rotate-180" : ""}`} /></button>}
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
