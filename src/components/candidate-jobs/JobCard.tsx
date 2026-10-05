import type { EducationAlignment } from "@/lib/education";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bookmark, BookmarkCheck, Building2, Check, ChevronDown, Clock, GitCompare, MapPin, Share2, Sparkles } from "lucide-react";
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

function MatchIntelligence({ score, row, open, onToggle }: { score: number | undefined; row: ScoreRow | undefined; open: boolean; onToggle: () => void }) {
  if (score == null) return <div className="max-w-44 text-right text-xs text-muted-foreground"><Sparkles className="mr-1 inline h-3.5 w-3.5" />Match score unavailable — complete your profile to see how you match.</div>;
  const s = Math.round(score), tier = matchTier(s), t = TONE[tier.tone];
  return (
    <div className="flex flex-col items-center text-center">
      <div className={`flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-full border-[3px] ${t.ring} ${t.bg}`}>
        <p className={`font-display text-3xl font-extrabold leading-none ${t.text}`}>{s}%</p>
        {row && <Button type="button" variant="link" size="sm" onClick={onToggle} aria-expanded={open} aria-label={`Detail: ${s}% match insights`} className={`mt-1 h-6 gap-0.5 px-1 text-xs ${t.text}`}>Detail<ChevronDown className={`!h-3 !w-3 transition-transform duration-300 ${open ? "rotate-180" : ""}`} /></Button>}
      </div>
      <p className="mt-1 text-xs font-bold text-foreground">Match Score</p>
      <p className={`text-xs font-semibold ${t.text}`}>{tier.label}</p>
    </div>
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
const BADGE = { primary: "bg-primary-soft text-primary border-primary/20", violet: "bg-violet/10 text-violet border-violet/20", teal: "bg-teal/10 text-teal border-teal/20", indigo: "bg-indigo/10 text-indigo border-indigo/20" };

function ReqGroup({ title, rows, names, tone }: { title: string; rows: ReqRow[] | null | undefined; names: { id: string; name: string }[]; tone: keyof typeof BADGE }) {
  const list = [...(rows ?? [])].sort((a, b) => (LEVEL_ORDER[a.requirement_level] ?? 3) - (LEVEL_ORDER[b.requirement_level] ?? 3));
  if (!list.length) return null;
  const nm = (id: string) => names.find((n) => n.id === id)?.name ?? "Unknown";
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {list.slice(0, 3).map((r) => <span key={r.lookup_id} className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${BADGE[tone]}`}>{nm(r.lookup_id)}</span>)}
        {list.length > 3 && <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">+{list.length - 3} More</span>}
      </div>
    </div>
  );
}

export function JobCard({ j, roleName, lists, onRemove, score, scoreRow, tax, locAlign, eduAlign }: { j: JobCardRow; roleName?: string | undefined; lists: JobLists; onRemove?: () => void; score?: number | undefined; scoreRow?: ScoreRow | undefined; tax?: Taxonomy | undefined; locAlign?: LocationAlignment | undefined; eduAlign?: EducationAlignment | null | undefined }) {
  const [insightsOpen, setInsightsOpen] = useState(false);
  const saved = lists.isSaved(j.job_id), compared = lists.isCompared(j.job_id);
  const salary = formatSalary(j.minimum_salary, j.maximum_salary, j.salary_currency);
  return (
    <article className={`${card} p-5 transition-shadow hover:shadow-md`}>
      <div className="flex items-start gap-4">
        <CompanyLogo path={j.companies?.logo_url} />
        <div className="min-w-0 flex-1">
          <Link to="/candidate/jobs/$id" params={{ id: j.job_id }} className="font-display text-lg font-bold leading-tight hover:text-primary">{j.job_title}</Link>
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
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ReqGroup title="Programming Languages" rows={j.job_languages} names={tax.languages} tone="primary" />
              <ReqGroup title="Technical Skills" rows={j.job_skills} names={tax.skills} tone="violet" />
              <ReqGroup title="Soft Skills Required" rows={j.job_soft_skills} names={tax.softSkills} tone="indigo" />
              <ReqGroup title="Tools & Technologies" rows={j.job_technologies} names={tax.technologies} tone="teal" />
            </div>
          )}
        </div>
        <div className="flex w-32 shrink-0 flex-col items-center self-stretch sm:w-40">
          {salary && <span className="text-center text-xs font-bold text-success sm:text-sm">{salary}</span>}
          <div className="flex flex-1 flex-col items-center justify-center py-3">
            <MatchIntelligence score={score ?? (scoreRow ? Number(scoreRow.overall_match_score) : undefined)} row={scoreRow} open={insightsOpen} onToggle={() => setInsightsOpen((value) => !value)} />
          </div>
        </div>
      </div>
      <MatchInsights row={scoreRow} open={insightsOpen} locAlign={locAlign} eduAlign={eduAlign} />
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
