import { RecruiterAnalyticsSnapshot } from "@/components/analytics/Analytics";
import { NotificationWidget } from "@/components/notifications/Notifications";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Bell, Bookmark, Briefcase, Building2, CheckCircle2, Copy, FileText, Gift, KanbanSquare, MapPin, Plus, Search, Trash2, Users, CalendarCheck } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Account } from "@/lib/account";
import { listJobs, duplicateJob } from "@/lib/jobs-data";
import { listJobApplications, listPipeline, addToPipeline } from "@/lib/applications-data";
import { listSavedCandidates, talentByIds, setSavedCandidate, setComparedCandidate } from "@/lib/talent-data";
import { computeRecruiterCompletion } from "@/lib/recruiter-completion";
import { appStatusCounts, appWindows, countBy, jobStatusCounts, recruiterKpis, stageCounts } from "@/lib/recruiter-dashboard";
import { APP_STATUSES, STAGES } from "@/lib/talent-rules";
import { PageHeader } from "./AppShell";
import { DraftJobsWidget } from "@/components/jobs/DraftJobsWidget";
import { RecruiterMatchWidget } from "@/components/match/Match";
import { MessagesWidget } from "@/components/messages/Messages";
import { RecruiterRecsWidget } from "@/components/recommend/Recommend";

const card = "rounded-2xl border border-border bg-card p-5 shadow-soft";
const linkBtn = "inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold hover:border-primary hover:text-primary";
const small = "text-xs font-semibold text-primary hover:underline";
const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
const appLabel = (s: string) => APP_STATUSES.find(([k]) => k === s)?.[1] ?? s;
const stageLabel = (s: string) => STAGES.find(([k]) => k === s)?.[1] ?? s;

async function loadDashboard(uid: string) {
  const [rp, jobs, apps, pipe, savedIds] = await Promise.all([
    supabase.from("recruiter_profiles").select("*, companies!recruiter_profiles_company_id_fkey(*)").eq("user_id", uid).maybeSingle(),
    listJobs(uid), listJobApplications(uid), listPipeline(uid), listSavedCandidates(uid),
  ]);
  if (rp.error) throw rp.error;
  const saved = savedIds.length ? await talentByIds(savedIds.slice(0, 5)) : [];
  const company = rp.data?.companies ?? null;
  let logo: string | null = null;
  if (company?.logo_url) logo = (await supabase.storage.from("company-branding").createSignedUrl(company.logo_url, 3600)).data?.signedUrl ?? null;
  return { rp: rp.data, company, logo, jobs, apps, pipe, savedCount: savedIds.length, saved };
}

function Widget({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <section className={`${card} min-w-0`}><div className="mb-4 flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 font-bold"><span className="h-4 w-1 rounded-full bg-gradient-primary" />{title}</h2>{action}</div>{children}</section>;
}
function Stat({ Icon, n, label }: { Icon: typeof Briefcase; n: number | string; label: string }) {
  return (
    <div className={`${card} group relative overflow-hidden transition-all hover:-translate-y-0.5`}>
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/10 blur-2xl" />
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-soft"><Icon className="h-4 w-4" /></span>
      <div className="mt-3 text-2xl font-extrabold tracking-tight">{n}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
function Soon() { return <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">Coming Soon</span>; }
function Empty({ text, cta }: { text: string; cta: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground"><p>{text}</p><div className="mt-3">{cta}</div></div>;
}
function Bars({ rows }: { rows: { key: string; label: string; n: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return <div className="space-y-2.5">{rows.map((b) => (
    <div key={b.key} className="flex items-center gap-3 text-sm"><span className="w-32 shrink-0 truncate font-medium">{b.label}</span><div className="h-2 flex-1 rounded-full bg-muted"><div className="h-2 rounded-full bg-gradient-primary" style={{ width: `${(b.n / max) * 100}%` }} /></div><span className="w-6 text-right text-muted-foreground">{b.n}</span></div>
  ))}</div>;
}

export function RecruiterDashboard({ account }: { account: Account }) {
  const uid = account.userId;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const key = ["recruiter-dashboard", uid];
  const { data, isLoading, error, refetch } = useQuery({ queryKey: key, queryFn: () => loadDashboard(uid) });
  const refresh = () => qc.invalidateQueries({ queryKey: key });

  if (isLoading) return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className={`${card} h-36 animate-pulse`} />)}</div>;
  if (error || !data) {
    const s = String(error);
    const msg = /fetch|network/i.test(s) ? "Network error. Check your connection." : /jwt|expired/i.test(s) ? "Your session expired. Please sign in again." : "Unable to load dashboard.";
    return <div className={`${card} p-8 text-center`}><p className="font-semibold">{msg}</p><button onClick={() => refetch()} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Try again</button></div>;
  }

  const { rp, company, jobs, apps, pipe } = data;
  const k = recruiterKpis(jobs, apps, pipe);
  const win = appWindows(apps);
  const appsByJob = countBy(apps, (a) => a.job_id);
  const pipeByJob = countBy(pipe.filter((p) => p.job_id), (p) => p.job_id as string);
  const byJobRows = jobs.filter((j) => appsByJob[j.job_id]).map((j) => ({ key: j.job_id, label: j.job_title, n: appsByJob[j.job_id] ?? 0 }));
  const companyComplete = !!(company && company.description.trim() && company.industry.trim() && company.website.trim());
  const rc = rp ? computeRecruiterCompletion({
    firstName: account.firstName, lastName: account.lastName, title: rp.title, location: rp.location, yearsExperience: rp.years_experience,
    specialization: rp.specialization, secondaryCount: rp.secondary_specializations.length, candidateTypeCount: rp.preferred_candidate_types.length,
    industryCount: rp.industry_specializations.length, summary: rp.professional_summary, hasCompany: !!company, companyComplete,
  }) : { percent: 0, suggestions: [] };
  const companyPct = company ? Math.round(([company.description, company.industry, company.website, company.headquarters, company.why_work_here, company.company_size].filter((x) => x?.trim()).length + (company.logo_url ? 1 : 0)) / 7 * 100) : 0;
  const sortedJobs = [...jobs].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const inPipe = new Set(pipe.map((p) => `${p.candidate_id}:${p.job_id ?? ""}`));
  const activity = [
    ...apps.map((a) => ({ at: a.application_date, text: `Application received: ${a.name} for ${a.jobs?.job_title ?? "a job"}` })),
    ...pipe.map((p) => ({ at: p.stage_date, text: p.current_stage === "hired" ? `${p.name} hired` : p.current_stage === "offer" ? `Offer extended to ${p.name}` : `${p.name} moved to ${stageLabel(p.current_stage)}` })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);

  async function run(fn: () => Promise<unknown>, ok: string) {
    try { await fn(); toast.success(ok); refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong"); }
  }

  return (
    <>
      <PageHeader title={`Welcome back, ${account.firstName || "there"}`} subtitle="Your hiring workspace at a glance." />

      <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary-soft via-card to-card p-6 shadow-soft">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-gradient-primary p-0.5 shadow-soft">
          {data.logo ? <img src={data.logo} alt={`${company?.company_name} logo`} className="h-14 w-14 shrink-0 rounded-xl border-2 border-card object-cover" />
            : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground"><Building2 className="h-6 w-6" /></span>}
          </div>
          <div className="min-w-0">
            <span className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-card/70 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-primary" /></span>
              AI sourcing active
            </span>
            <div className="text-lg font-bold">{account.firstName} {account.lastName}</div>
            <div className="text-sm text-muted-foreground">{rp?.title || "Recruiter"}{(company?.company_name || rp?.company_name) && ` · ${company?.company_name || rp?.company_name}`}</div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {rp?.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{rp.location}</span>}
              {rp?.specialization && <span className="rounded-full bg-primary-soft px-2 py-0.5 font-semibold text-primary">{rp.specialization}</span>}
              {rp && <span>{rp.years_experience} yrs recruiting</span>}
            </div>
            <p className="mt-3 inline-flex items-start gap-1.5 rounded-xl bg-card/70 px-3 py-1.5 text-xs text-foreground">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              {jobs.filter((j) => j.job_status === "active").length} active job{jobs.filter((j) => j.job_status === "active").length === 1 ? "" : "s"}, {apps.length} application{apps.length === 1 ? "" : "s"} and {data.savedCount} saved candidate{data.savedCount === 1 ? "" : "s"}.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 lg:items-end">
          <div className="flex items-center gap-4">
            {[["Profile", rc.percent], ["Company", companyPct]].map(([l, v]) => (
              <div key={l} className="flex items-center gap-2">
                <div className="relative h-12 w-12 rounded-full" style={{ background: `conic-gradient(var(--primary) ${Number(v) * 3.6}deg, var(--muted) 0deg)` }}>
                  <div className="absolute inset-1 flex items-center justify-center rounded-full bg-card text-xs font-extrabold text-primary">{v}%</div>
                </div>
                <span className="text-xs font-semibold">{l}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Link to="/recruiter/jobs/create" className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90"><Plus className="h-4 w-4" />Create Job</Link>
            <Link to="/recruiter/candidates" className={`${linkBtn} bg-card/70`}><Search className="h-4 w-4" />Search Candidates</Link>
            <Link to="/recruiter/applications" className={`${linkBtn} bg-card/70`}><FileText className="h-4 w-4" />Applications</Link>
            <Link to="/recruiter/pipeline" className={`${linkBtn} bg-card/70`}><KanbanSquare className="h-4 w-4" />Pipeline</Link>
          </div>
        </div>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Stat Icon={Briefcase} n={k.activeJobs} label="Active jobs" />
        <Stat Icon={FileText} n={k.applications} label="Applications" />
        <Stat Icon={Users} n={k.inPipeline} label="In pipeline" />
        <Stat Icon={CalendarCheck} n={k.interviewing} label="Interviewing" />
        <Stat Icon={Gift} n={k.offers} label="Offers" />
        <Stat Icon={CheckCircle2} n={k.hires} label="Hires" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-6 xl:col-span-2">
          <DraftJobsWidget uid={uid} jobs={jobs} onChange={refresh} />
          <Widget title="Your Jobs" action={<div className="flex flex-wrap gap-1.5">{jobStatusCounts(jobs).map((s) => <span key={s.key} className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold capitalize">{s.n} {s.key}</span>)}</div>}>
            {jobs.length === 0 ? <Empty text="No jobs yet." cta={<Link to="/recruiter/jobs/create" className={linkBtn}>Create Job</Link>} /> : (
              <div className="space-y-2">{sortedJobs.slice(0, 6).map((j) => (
                <div key={j.job_id} className="rounded-xl border border-border px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0"><div className="truncate text-sm font-semibold"><Link to="/recruiter/jobs/$id" params={{ id: j.job_id }} className="hover:text-primary hover:underline underline-offset-2">{j.job_title}</Link></div><div className="text-xs text-muted-foreground">{appsByJob[j.job_id] ?? 0} applications · {pipeByJob[j.job_id] ?? 0} in pipeline · Created {fmt(j.created_at)} · Updated {fmt(j.updated_at)}</div></div>
                    <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold capitalize text-primary">{j.job_status}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3">
                    <Link to="/recruiter/jobs/$id" params={{ id: j.job_id }} className={small}>View</Link>
                    {j.job_status !== "closed" && <Link to="/recruiter/jobs/$id/edit" params={{ id: j.job_id }} className={small}>Edit</Link>}
                    <Link to="/recruiter/pipeline/$jobId" params={{ jobId: j.job_id }} className={small}>Pipeline</Link>
                    <Link to="/recruiter/applications" className={small}>Applications</Link>
                    <button onClick={() => run(() => duplicateJob(uid, j.job_id), "Job duplicated as a draft")} className={`${small} inline-flex items-center gap-1`}><Copy className="h-3 w-3" />Duplicate</button>
                  </div>
                </div>
              ))}</div>
            )}
          </Widget>

          <Widget title="Applications Overview">
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/60 p-3"><div className="text-xl font-extrabold">{win.week}</div><div className="text-xs text-muted-foreground">This week</div></div>
              <div className="rounded-xl bg-muted/60 p-3"><div className="text-xl font-extrabold">{win.month}</div><div className="text-xs text-muted-foreground">This month</div></div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div><h3 className="mb-2 text-sm font-semibold text-muted-foreground">By status</h3><Bars rows={appStatusCounts(apps)} /></div>
              <div><h3 className="mb-2 text-sm font-semibold text-muted-foreground">By job</h3>{byJobRows.length ? <Bars rows={byJobRows} /> : <p className="text-sm text-muted-foreground">No applications yet.</p>}</div>
            </div>
          </Widget>

          <Widget title="Recent Applications" action={<Link to="/recruiter/applications" className={small}>View all</Link>}>
            {apps.length === 0 ? <Empty text="No applications yet." cta={<Link to="/recruiter/candidates" className={linkBtn}>Search Candidates</Link>} /> : (
              <div className="space-y-2">{apps.slice(0, 5).map((a) => (
                <div key={a.application_id} className="flex flex-col gap-2 rounded-xl border border-border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0"><div className="truncate text-sm font-semibold"><Link to="/recruiter/candidates/$id" params={{ id: a.candidate_id }} className="hover:text-primary hover:underline underline-offset-2">{a.name}</Link>{a.candTitle && ` · ${a.candTitle}`}</div><div className="truncate text-xs text-muted-foreground"><Link to="/recruiter/jobs/$id" params={{ id: a.job_id }} className="hover:text-primary hover:underline underline-offset-2">{a.jobs?.job_title}</Link> · Applied {fmt(a.application_date)}</div></div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">{appLabel(a.application_status)}</span>
                    <Link to="/recruiter/applications/$id" params={{ id: a.application_id }} className={small}>Review</Link>
                    <Link to="/recruiter/candidates/$id" params={{ id: a.candidate_id }} className={small}>Candidate</Link>
                    {!inPipe.has(`${a.candidate_id}:${a.job_id}`) && <button onClick={() => run(() => addToPipeline(uid, a.candidate_id, a.job_id), "Candidate added to pipeline")} className={small}>Move to pipeline</button>}
                  </div>
                </div>
              ))}</div>
            )}
          </Widget>

          <Widget title="Pipeline Overview" action={<Link to="/recruiter/pipeline" className={small}>Open board</Link>}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">{stageCounts(pipe).map((s) => (
              <div key={s.key} className="rounded-xl border border-border p-3 text-center"><div className="text-xl font-extrabold">{s.n}</div><div className="text-xs text-muted-foreground">{s.label}</div></div>
            ))}</div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
              <div><div className="font-bold">{pipe.length}</div><div className="text-xs text-muted-foreground">Pipeline candidates</div></div>
              <div><div className="font-bold">{k.interviewing}</div><div className="text-xs text-muted-foreground">Active interviews</div></div>
              <div><div className="font-bold">{k.offers}</div><div className="text-xs text-muted-foreground">Offers outstanding</div></div>
              <div><div className="font-bold text-muted-foreground">—</div><div className="text-xs text-muted-foreground">Conversion (soon)</div></div>
              <div><div className="font-bold text-muted-foreground">—</div><div className="text-xs text-muted-foreground">Time to hire (soon)</div></div>
            </div>
            {pipe.length === 0 ? <div className="mt-4"><Empty text="No pipeline activity yet." cta={<Link to="/recruiter/candidates" className={linkBtn}>Build Pipeline</Link>} /></div> : (
              <ul className="mt-4 space-y-1.5 text-sm">{pipe.slice(0, 5).map((p) => <li key={p.pipeline_id}><b>{p.name}</b> moved to {stageLabel(p.current_stage)}{p.jobs?.job_title && ` · ${p.jobs.job_title}`} <span className="text-xs text-muted-foreground">· {fmt(p.stage_date)}</span></li>)}</ul>
            )}
          </Widget>

          <Widget title="Recent Activity">
            {activity.length === 0 ? <Empty text="No recent activity." cta={<Link to="/recruiter/jobs/create" className={linkBtn}>Create Job</Link>} /> : (
              <ol className="space-y-3 border-l border-border pl-4">{activity.map((a, i) => <li key={i} className="text-sm"><div className="font-medium">{a.text}</div><div className="text-xs text-muted-foreground">{fmt(a.at)}</div></li>)}</ol>
            )}
          </Widget>
        </div>

        <div className="space-y-6">
          <RecruiterMatchWidget />
          <Widget title="Quick Actions">
            <div className="grid grid-cols-2 gap-2">
              <Link to="/recruiter/jobs/create" className={linkBtn}><Plus className="h-4 w-4" />New Job</Link>
              <Link to="/recruiter/candidates" className={linkBtn}><Search className="h-4 w-4" />Candidates</Link>
              <Link to="/recruiter/applications" className={linkBtn}><FileText className="h-4 w-4" />Applications</Link>
              <Link to="/recruiter/pipeline" className={linkBtn}><KanbanSquare className="h-4 w-4" />Pipeline</Link>
              <Link to="/recruiter/candidates/saved" className={linkBtn}><Bookmark className="h-4 w-4" />Saved</Link>
              <Link to="/recruiter/company" className={linkBtn}><Building2 className="h-4 w-4" />Company</Link>
            </div>
          </Widget>

          <Widget title="Profile Completion">
            <div className="space-y-3 text-sm">
              {[["Recruiter profile", rc.percent], ["Company profile", companyPct]].map(([l, v]) => (
                <div key={l as string}><div className="flex justify-between"><span className="font-medium">{l}</span><span className="font-bold text-primary">{v}%</span></div><div className="mt-1.5 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-gradient-primary" style={{ width: `${v}%` }} /></div></div>
              ))}
            </div>
            {rc.suggestions.length > 0 && <ul className="mt-3 space-y-1 text-xs text-muted-foreground">{rc.suggestions.slice(0, 3).map((s) => <li key={s}>• {s}</li>)}</ul>}
          </Widget>

          <Widget title="Saved Candidates" action={<Link to="/recruiter/candidates/saved" className={small}>View all ({data.savedCount})</Link>}>
            {data.saved.length === 0 ? <Empty text="No saved candidates yet." cta={<Link to="/recruiter/candidates" className={linkBtn}>Search Candidates</Link>} /> : (
              <div className="space-y-2">{data.saved.map((c) => (
                <div key={c.id} className="rounded-xl border border-border px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><div className="truncate text-sm font-semibold">{c.name}</div><div className="truncate text-xs text-muted-foreground">{c.jobTitle} · {c.years} yrs · {c.availability}</div></div>
                    <button aria-label="Remove saved candidate" onClick={() => run(() => setSavedCandidate(uid, c.id, false), "Removed from saved")} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-3">
                    <Link to="/recruiter/candidates/$id" params={{ id: c.id }} className={small}>Profile</Link>
                    <button onClick={() => run(async () => { await setComparedCandidate(uid, c.id, true); navigate({ to: "/recruiter/candidates/compare" }); }, "Added to compare")} className={small}>Compare</button>
                    <button onClick={() => run(() => addToPipeline(uid, c.id, null), "Candidate added to pipeline")} className={small}>Add to pipeline</button>
                  </div>
                </div>
              ))}</div>
            )}
          </Widget>

          <Widget title="Candidate Alerts" action={<Soon />}>
            <ul className="space-y-1.5 text-sm text-muted-foreground">{["New candidate matches", "Availability changes", "Profile updates", "Recently joined candidates"].map((x) => <li key={x}>• {x}</li>)}</ul>
          </Widget>
          <RecruiterRecsWidget uid={uid} />
          <MessagesWidget role="recruiter" />
          <Widget title="Career Intelligence" action={<Soon />}>
            <ul className="space-y-1.5 text-sm text-muted-foreground">{["Candidate Readiness", "Skill Gap Analysis", "Market Intelligence", "Salary Intelligence"].map((x) => <li key={x}>• {x}</li>)}</ul>
          </Widget>
          <RecruiterAnalyticsSnapshot uid={uid} />
          <NotificationWidget uid={uid} role="recruiter" />
        </div>
      </div>
    </>
  );
}
