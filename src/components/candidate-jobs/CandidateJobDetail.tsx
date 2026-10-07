import { useEffect } from "react";
import { track } from "@/lib/track";
import { ContactRecruiterButton } from "@/components/messages/Messages";
import { ReportButton } from "@/components/moderation/ReportButton";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Bookmark, BookmarkCheck, Briefcase, Clock, DollarSign, Globe, GitCompare, MapPin, Share2, Sparkles } from "lucide-react";
import type { Account } from "@/lib/account";
import { loadTaxonomy } from "@/lib/jobs-data";
import { loadCandidateJob } from "@/lib/job-search-data";
import { card, friendlyError } from "@/components/profile/parts";
import { BrandImg, Item } from "@/components/recruiter/shared";
import { Markdown } from "@/components/jobs/Markdown";
import { ARRANGEMENT, EMPLOYMENT, RequirementList, formatSalary, lbl } from "@/components/jobs/shared";
import { CompanyLogo, CompareTray, StealthBadge, postedAgo } from "./JobCard";
import { MatchPanel, useAutoRecalc, useScores } from "@/components/match/Match";
import { ApplyButton } from "@/components/applications/Applications";
import { shareJob, useJobLists } from "./useJobLists";

const act = "inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary";

export function CandidateJobDetail({ account, id }: { account: Account; id: string }) {
  const lists = useJobLists(account.userId);
  const tax = useQuery({ queryKey: ["taxonomy"], queryFn: loadTaxonomy, staleTime: 5 * 60_000 });
  const q = useQuery({ queryKey: ["candidate-job", id], queryFn: () => loadCandidateJob(id) });
  useEffect(() => { if (q.data) track("job_view", id); }, [q.data, id]);

  if (q.isLoading || tax.isLoading) return <div className={`${card} h-96 animate-pulse`} />;
  if (q.error || tax.error) return <div className={`${card} p-8 text-center`}><p className="font-semibold">{friendlyError(q.error ?? tax.error, "Unable to load this job.")}</p><button onClick={() => { q.refetch(); tax.refetch(); }} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Try again</button></div>;
  if (!q.data || !tax.data) return (
    <div className={`${card} mx-auto max-w-xl p-10 text-center`}>
      <p className="font-display text-lg font-bold">Job No Longer Available</p>
      <p className="mt-1 text-sm text-muted-foreground">This role has been filled, paused or closed by the recruiter.</p>
      {lists.isSaved(id) && <button onClick={() => lists.toggleSave(id)} className="mt-4 rounded-xl border border-border px-4 py-2 text-sm font-semibold">Remove from saved</button>}
      <Link to="/candidate/jobs" className="ml-2 mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Browse jobs</Link>
    </div>
  );

  const { job: j, company: c } = q.data, t = tax.data;
  const salary = formatSalary(j.minimum_salary, j.maximum_salary, j.salary_currency);
  const saved = lists.isSaved(id), compared = lists.isCompared(id);
  const role = t.roles.find((r) => r.id === j.role_id)?.name;

  return (
    <div className="space-y-6 pb-16">
      <Link to="/candidate/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" />Back to search</Link>
      <div className={`${card} overflow-hidden`}>
        {c?.banner_url ? <BrandImg path={c.banner_url} alt="Company banner" className="h-28 w-full object-cover sm:h-36" /> : <div className="h-28 bg-gradient-primary sm:h-36" />}
        <div className="p-6 pt-0">
          <div className="-mt-8"><CompanyLogo path={c?.logo_url} size="h-16 w-16 border-4 border-card" /></div>
          <h1 className="mt-3 font-display text-2xl font-extrabold sm:text-3xl">{j.job_title}</h1>
          <p className="font-medium">{c?.company_name}<StealthBadge on={j.is_confidential} /></p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{j.location} · {lbl(ARRANGEMENT, j.work_arrangement)}</span>
            <span className="inline-flex items-center gap-1"><Briefcase className="h-4 w-4" />{lbl(EMPLOYMENT, j.employment_type)}</span>
            <span>{j.minimum_years_experience}+ years{j.experience_level && ` · ${j.experience_level}`}</span>
            {salary && <span className="inline-flex items-center gap-1 font-semibold text-foreground"><DollarSign className="h-4 w-4" />{salary}</span>}
            <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" />Posted {postedAgo(j.published_at ?? j.created_at)}</span>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <ApplyButton uid={account.userId} jobId={id} jobStatus={j.job_status} jobTitle={j.job_title} company={c?.company_name ?? ""} />
            <ContactRecruiterButton uid={account.userId} jobId={id} />
            <button onClick={() => lists.toggleSave(id)} aria-pressed={saved} className={`${act} ${saved ? "border-primary text-primary" : ""}`}>{saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}{saved ? "Saved" : "Save Job"}</button>
            <button onClick={() => lists.toggleCompare(id)} aria-pressed={compared} className={`${act} ${compared ? "border-primary text-primary" : ""}`}><GitCompare className="h-4 w-4" />{compared ? "Comparing" : "Compare Job"}</button>
            <button onClick={() => shareJob(id, j.job_title)} className={act}><Share2 className="h-4 w-4" />Share</button>
            <ReportButton type="job" targetId={id} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <div className={`${card} p-6`}><Markdown text={j.job_description} /></div>
          {(j.benefits_summary || j.bonus_info) && <div className={`${card} p-6`}><h2 className="font-display text-lg font-bold">Benefits</h2>{j.bonus_info && <p className="mt-2 text-sm"><strong>Bonus:</strong> {j.bonus_info}</p>}{j.benefits_summary && <p className="mt-2 whitespace-pre-line text-sm">{j.benefits_summary}</p>}</div>}
          <div className={`${card} space-y-5 p-6`}>
            <h2 className="font-display text-lg font-bold">Technical Requirements</h2>
            <Item k="Programming Languages" v={<RequirementList items={q.data.languages} options={t.languages} />} />
            <Item k="Technical Skills" v={<RequirementList items={q.data.skills} options={t.skills} />} />
            <Item k="Soft Skills Required" v={<RequirementList items={q.data.softSkills} options={t.softSkills} />} />
          </div>
          <div className={`${card} p-6`}><h2 className="mb-4 font-display text-lg font-bold">Technology Stack</h2><RequirementList items={q.data.technologies} options={t.technologies} /></div>
        </div>
        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <div className={`${card} p-5`}>
            <h2 className="font-display font-bold">Job Details</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <Item k="Role" v={role} /><Item k="Type" v={lbl(EMPLOYMENT, j.employment_type)} /><Item k="Arrangement" v={lbl(ARRANGEMENT, j.work_arrangement)} />
              <Item k="Experience" v={`${j.minimum_years_experience}+ yrs`} /><Item k="Level" v={j.experience_level} /><Item k="Salary" v={salary} />
            </dl>
          </div>
          {c && (
            <div className={`${card} p-5`}>
              <div className="flex items-center gap-3"><CompanyLogo path={c.logo_url} /><div className="min-w-0"><p className="truncate font-semibold">{c.company_name}</p><p className="text-xs text-muted-foreground">{[c.industry, c.company_size && `${c.company_size} employees`].filter(Boolean).join(" · ")}</p></div></div>
              {j.is_confidential ? <p className="mt-4 text-sm text-muted-foreground">The recruiter is keeping the company name private for now. You can ask about it through in-app messages.</p> : <p className="mt-4 line-clamp-6 whitespace-pre-line text-sm">{c.description}</p>}
              {c.why_work_here && <><p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why work here</p><p className="mt-1 line-clamp-4 whitespace-pre-line text-sm">{c.why_work_here}</p></>}
              {c.website && <a href={/^https?:\/\//.test(c.website) ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer noopener" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"><Globe className="h-4 w-4" />{c.website.replace(/^https?:\/\//, "")}</a>}
            </div>
          )}
          <JobMatch uid={account.userId} jobId={id} />
        </aside>
      </div>
      <CompareTray lists={lists} />
    </div>
  );
}

function JobMatch({ uid, jobId }: { uid: string; jobId: string }) {
  const r = useAutoRecalc();
  const q = useScores({ candidateId: uid });
  const row = q.data?.find((x) => x.job_id === jobId);
  return <MatchPanel row={row} loading={q.isLoading} recalculating={r.isPending} onRecalc={() => r.mutate(undefined, { onSuccess: () => toast.success("Match updated") })} />;
}
