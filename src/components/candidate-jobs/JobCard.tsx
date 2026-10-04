import { Link } from "@tanstack/react-router";
import { Bookmark, BookmarkCheck, Building2, Clock, GitCompare, MapPin, Share2 } from "lucide-react";
import type { JobCardRow } from "@/lib/job-search-data";
import { plainPreview } from "@/lib/job-search";
import { card } from "@/components/profile/parts";
import { BrandImg } from "@/components/recruiter/shared";
import { ARRANGEMENT, EMPLOYMENT, formatSalary, lbl } from "@/components/jobs/shared";
import { shareJob, type JobLists } from "./useJobLists";
import { MatchBadge } from "@/components/match/Match";

export const postedAgo = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? "Today" : d === 1 ? "Yesterday" : d < 30 ? `${d} days ago` : new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export function CompanyLogo({ path, size = "h-12 w-12" }: { path: string | null | undefined; size?: string }) {
  return path ? <BrandImg path={path} alt="Company logo" className={`${size} shrink-0 rounded-xl object-cover`} /> : <div className={`grid ${size} shrink-0 place-items-center rounded-xl bg-primary-soft`}><Building2 className="h-5 w-5 text-primary" /></div>;
}

const act = "inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold hover:border-primary hover:text-primary";

export function JobCard({ j, roleName, lists, onRemove, score }: { j: JobCardRow; roleName?: string | undefined; lists: JobLists; onRemove?: () => void; score?: number | undefined }) {
  const saved = lists.isSaved(j.job_id), compared = lists.isCompared(j.job_id);
  const salary = formatSalary(j.minimum_salary, j.maximum_salary, j.salary_currency);
  return (
    <article className={`${card} p-5 transition-shadow hover:shadow-md`}>
      <div className="flex gap-4">
        <CompanyLogo path={j.companies?.logo_url} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link to="/candidate/jobs/$id" params={{ id: j.job_id }} className="font-display text-lg font-bold leading-tight hover:text-primary">{j.job_title}</Link>
              <p className="text-sm font-medium">{j.companies?.company_name}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2"><MatchBadge score={score} />{salary && <span className="hidden rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success sm:inline">{salary}</span>}</div>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{j.location} · {lbl(ARRANGEMENT, j.work_arrangement)}</span>
            <span>{lbl(EMPLOYMENT, j.employment_type)}</span>
            <span>{j.minimum_years_experience}+ yrs{j.experience_level && ` · ${j.experience_level}`}</span>
            {roleName && <span className="rounded-full bg-primary-soft px-2 py-0.5 font-semibold text-primary">{roleName}</span>}
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{postedAgo(j.published_at ?? j.created_at)}</span>
          </div>
          {salary && <p className="mt-2 text-sm font-semibold text-success sm:hidden">{salary}</p>}
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{plainPreview(j.job_description)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/candidate/jobs/$id" params={{ id: j.job_id }} className="rounded-xl bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90">View Job</Link>
            {onRemove ? <button onClick={onRemove} className={act}><BookmarkCheck className="h-4 w-4" />Remove</button>
              : <button onClick={() => lists.toggleSave(j.job_id)} aria-pressed={saved} className={`${act} ${saved ? "border-primary text-primary" : ""}`}>{saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}{saved ? "Saved" : "Save"}</button>}
            <button onClick={() => lists.toggleCompare(j.job_id)} aria-pressed={compared} className={`${act} ${compared ? "border-primary text-primary" : ""}`}><GitCompare className="h-4 w-4" />{compared ? "Comparing" : "Compare"}</button>
            <button onClick={() => shareJob(j.job_id, j.job_title)} className={act} aria-label="Share job"><Share2 className="h-4 w-4" /><span className="hidden sm:inline">Share</span></button>
          </div>
        </div>
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
