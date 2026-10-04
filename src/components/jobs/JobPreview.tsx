import { Link } from "@tanstack/react-router";
import { ArrowLeft, Briefcase, Building2, Clock, DollarSign, MapPin } from "lucide-react";
import { card } from "@/components/profile/parts";
import { BrandImg, Item } from "@/components/recruiter/shared";
import { Markdown } from "./Markdown";
import { ARRANGEMENT, EMPLOYMENT, RequirementList, formatSalary, lbl } from "./shared";
import { JobPageState, useJobPage } from "./JobDetail";

export function JobPreview({ id }: { id: string }) {
  const q = useJobPage(id);
  return (
    <JobPageState q={q}>{(d) => {
      const j = d.job, c = d.company, salary = formatSalary(j.minimum_salary, j.maximum_salary, j.salary_currency);
      return (
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary-soft px-4 py-3 text-sm">
            <span className="font-semibold text-primary">Preview — this is how candidates will see this job</span>
            <Link to="/recruiter/jobs/$id" params={{ id }} className="inline-flex items-center gap-1.5 rounded-xl bg-card px-3 py-1.5 font-semibold hover:text-primary"><ArrowLeft className="h-4 w-4" />Back to job</Link>
          </div>
          <div className={`${card} overflow-hidden`}>
            {c?.banner_url ? <BrandImg path={c.banner_url} alt="Company banner" className="h-28 w-full object-cover sm:h-36" /> : <div className="h-28 bg-gradient-primary sm:h-36" />}
            <div className="p-6 pt-0">
              <div className="-mt-8">{c?.logo_url ? <BrandImg path={c.logo_url} alt="Company logo" className="h-16 w-16 rounded-2xl border-4 border-card bg-card object-cover" /> : <div className="grid h-16 w-16 place-items-center rounded-2xl border-4 border-card bg-muted"><Building2 className="h-6 w-6 text-muted-foreground" /></div>}</div>
              <h1 className="mt-3 font-display text-2xl font-extrabold">{j.job_title}</h1>
              <p className="font-medium">{c?.company_name}</p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{j.location} · {lbl(ARRANGEMENT, j.work_arrangement)}</span>
                <span className="inline-flex items-center gap-1"><Briefcase className="h-4 w-4" />{lbl(EMPLOYMENT, j.employment_type)}</span>
                <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" />{j.minimum_years_experience}+ years{j.experience_level && ` · ${j.experience_level}`}</span>
                {salary && <span className="inline-flex items-center gap-1 font-semibold text-foreground"><DollarSign className="h-4 w-4" />{salary}</span>}
              </div>
              <button disabled className="mt-5 cursor-not-allowed rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground opacity-70">Apply Now</button>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <div className="min-w-0 space-y-6">
              <div className={`${card} p-6`}><Markdown text={j.job_description} /></div>
              {(j.benefits_summary || j.bonus_info) && <div className={`${card} p-6`}><h2 className="font-display text-lg font-bold">Benefits & Compensation</h2>{j.bonus_info && <p className="mt-2 text-sm"><strong>Bonus:</strong> {j.bonus_info}</p>}{j.benefits_summary && <p className="mt-2 whitespace-pre-line text-sm">{j.benefits_summary}</p>}</div>}
            </div>
            <div className="space-y-6">
              <div className={`${card} space-y-5 p-5`}>
                <h2 className="font-display font-bold">Requirements</h2>
                <Item k="Languages" v={<RequirementList items={d.languages} options={d.tax.languages} />} />
                <Item k="Skills" v={<RequirementList items={d.skills} options={d.tax.skills} />} />
                <Item k="Technologies" v={<RequirementList items={d.technologies} options={d.tax.technologies} />} />
              </div>
              {c && <div className={`${card} p-5`}><h2 className="font-display font-bold">About {c.company_name}</h2><p className="mt-1 text-xs text-muted-foreground">{[c.industry, c.company_size && `${c.company_size} employees`].filter(Boolean).join(" · ")}</p>
                <p className="mt-3 line-clamp-6 whitespace-pre-line text-sm">{c.why_work_here || c.description}</p></div>}
            </div>
          </div>
        </div>
      );
    }}</JobPageState>
  );
}
