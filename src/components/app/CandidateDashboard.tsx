import { formatSalaryAmount } from "@/lib/salary";
import { CandidateAnalyticsSnapshot } from "@/components/analytics/Analytics";
import { NotificationWidget } from "@/components/notifications/Notifications";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Bookmark, Briefcase, CheckCircle2, FileText, Gift, MapPin, Search, Sparkles, Target, Trash2, Upload, UserCheck, XCircle, CircleSlash } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Account } from "@/lib/account";
import { computeCompletion } from "@/lib/profile-completion";
import { applicationMetrics, buildActivity, statusBreakdown, type AppLite } from "@/lib/candidate-dashboard";
import { APP_STATUSES } from "@/lib/talent-rules";
import { PageHeader } from "./AppShell";
import { useAvatarUrl } from "./ProfilePhoto";
import { CandidateMatchWidget } from "@/components/match/Match";
import { CareerWidget } from "@/components/career/Career";
import { MessagesWidget } from "@/components/messages/Messages";
import { CandidateRecsWidget } from "@/components/recommend/Recommend";
import { NextInterviewBanner } from "@/components/applications/InterviewsHub";

const card = "rounded-2xl border border-border bg-card p-5 shadow-soft";
const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
const statusLabel = (s: string) => APP_STATUSES.find(([k]) => k === s)?.[1] ?? s;

async function loadDashboard(uid: string) {
  const [p, prof, apps, saved, skills, langs, techs, exp, edu, certs] = await Promise.all([
    supabase.from("candidate_profiles").select("*").eq("user_id", uid).maybeSingle(),
    supabase.from("profiles").select("avatar_path").eq("user_id", uid).maybeSingle(),
    supabase.from("applications").select("application_id, application_date, application_status, updated_at, job_id, jobs(job_title, location, work_arrangement, companies(company_name))").eq("candidate_id", uid).order("application_date", { ascending: false }),
    supabase.from("saved_jobs").select("saved_job_id, saved_date, job_id, jobs(job_title, location, companies(company_name))").eq("candidate_id", uid).order("saved_date", { ascending: false }),
    supabase.from("candidate_skills").select("created_at, technical_skills(skill_name)").eq("candidate_id", uid),
    supabase.from("candidate_languages").select("created_at").eq("candidate_id", uid),
    supabase.from("candidate_technologies").select("created_at").eq("candidate_id", uid),
    supabase.from("work_experience").select("experience_id").eq("candidate_id", uid),
    supabase.from("education").select("education_id").eq("candidate_id", uid),
    supabase.from("certifications").select("created_at, certification_name").eq("candidate_id", uid),
  ]);
  for (const r of [p, prof, apps, saved, skills, langs, techs, exp, edu, certs]) if (r.error) throw r.error;
  return { profile: p.data, avatarPath: prof.data?.avatar_path ?? null, apps: apps.data ?? [], saved: saved.data ?? [], skills: skills.data ?? [], langCount: langs.data?.length ?? 0, techCount: techs.data?.length ?? 0, expCount: exp.data?.length ?? 0, eduCount: edu.data?.length ?? 0, certs: certs.data ?? [] };
}

function Widget({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className={`${card} min-w-0 transition-shadow hover:shadow-md`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold"><span className="h-4 w-1 rounded-full bg-gradient-primary" />{title}</h2>{action}
      </div>
      {children}
    </section>
  );
}
function Stat({ Icon, n, label }: { Icon: typeof Briefcase; n: number | string; label: string }) {
  return (
    <div className={`${card} group relative flex h-full flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:border-primary/40`}>
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-100" />
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-soft"><Icon className="h-4 w-4" /></span>
      <div className="mt-3 text-2xl font-extrabold tracking-tight">{n}</div>
      <div className="text-sm leading-snug text-muted-foreground">{label}</div>
    </div>
  );
}
function DashboardAvatar({ name, path }: { name: string; path: string | null }) {
  const url = useAvatarUrl(path);
  const initials = name.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  if (url) return <img src={url} alt={name} className="h-14 w-14 shrink-0 rounded-full object-cover" />;
  return <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-lg font-bold text-primary-foreground">{initials}</span>;
}
function Soon() { return <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">Coming Soon</span>; }
function Empty({ text, cta }: { text: string; cta: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground"><p>{text}</p><div className="mt-3">{cta}</div></div>;
}
const linkBtn = "inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold hover:border-primary hover:text-primary";

export function CandidateDashboard({ account }: { account: Account }) {
  const uid = account.userId;
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["candidate-dashboard", uid], queryFn: () => loadDashboard(uid) });

  if (isLoading) return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className={`${card} h-36 animate-pulse`} />)}</div>;
  if (error || !data) {
    const msg = error instanceof Error && /fetch|network/i.test(error.message) ? "Network error. Check your connection." : /jwt|expired/i.test(String(error)) ? "Your session expired. Please sign in again." : "Unable to load dashboard.";
    return <div className={`${card} p-8 text-center`}><p className="font-semibold">{msg}</p><button onClick={() => refetch()} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Try again</button></div>;
  }

  const p = data.profile;
  const apps: (AppLite & { job_id: string; company: string; location: string })[] = data.apps.map((a) => ({
    application_id: a.application_id, application_date: a.application_date, application_status: a.application_status, updated_at: a.updated_at, job_id: a.job_id,
    job_title: a.jobs?.job_title ?? "Job", company: a.jobs?.companies?.company_name ?? "", location: a.jobs?.location ?? "",
  }));
  const m = applicationMetrics(apps);
  const breakdown = statusBreakdown(apps);
  const maxN = Math.max(1, ...breakdown.map((b) => b.n));
  const completion = p ? computeCompletion({
    jobTitle: p.job_title, headline: p.headline, location: p.location, yearsExperience: p.years_experience, summary: p.summary,
    experienceCount: data.expCount, educationCount: data.eduCount, certificationCount: data.certs.length,
    skillCount: data.skills.length, languageCount: data.langCount, technologyCount: data.techCount,
    targetRoleCount: p.target_roles.length, salaryExpectation: formatSalaryAmount(p.salary_amount, p.salary_currency), hasResume: !!p.resume_path,
  }) : { percent: 0, recommendations: ["Finish setting up your profile."] };
  const recruiterEvents = apps.filter((a) => a.application_status !== "applied").sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const activity = buildActivity({
    apps,
    saved: data.saved.map((s) => ({ saved_date: s.saved_date, job_title: s.jobs?.job_title ?? "a job" })),
    skills: data.skills.map((s) => ({ created_at: s.created_at, name: s.technical_skills?.skill_name ?? "skill" })),
    certs: data.certs,
    profileUpdatedAt: p?.updated_at ?? null,
  }).slice(0, 8);

  async function removeSaved(id: string) {
    const { error: e } = await supabase.from("saved_jobs").delete().eq("saved_job_id", id);
    if (e) { toast.error("Couldn't remove saved job."); return; }
    toast.success("Removed from saved jobs");
    qc.invalidateQueries({ queryKey: ["candidate-dashboard", uid] });
  }

  return (
    <>
      <PageHeader title={`Welcome back, ${account.firstName || "there"}`} subtitle="Here's where your job search stands today." />
      <NextInterviewBanner uid={uid} role="candidate" />

      <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary-soft via-card to-card p-6 shadow-soft">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="rounded-full bg-gradient-primary p-0.5 shadow-soft"><div className="rounded-full bg-card p-0.5"><DashboardAvatar name={`${account.firstName} ${account.lastName}`} path={data.avatarPath} /></div></div>
            <div className="min-w-0">
              <span className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-card/70 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-primary" /></span>
                AI matching active
              </span>
              <div className="text-lg font-bold">{account.firstName} {account.lastName}</div>
              <div className="text-sm text-muted-foreground">{p?.job_title || "Add your current role"}</div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {p?.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{p.location}</span>}
                {p && <span>{p.years_experience} yrs experience</span>}
                {p?.availability && <span className="rounded-full bg-primary-soft px-2 py-0.5 font-semibold text-primary">{p.availability}</span>}
              </div>
              <p className="mt-3 inline-flex items-start gap-1.5 rounded-xl bg-card/70 px-3 py-1.5 text-xs text-foreground backdrop-blur">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                {m.active} active application{m.active === 1 ? "" : "s"}, {data.saved.length} saved job{data.saved.length === 1 ? "" : "s"} and your profile is {completion.percent}% complete.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 xl:items-end">
            <div className="flex items-center gap-3">
              <div className="relative h-14 w-14 rounded-full" style={{ background: `conic-gradient(var(--primary) ${completion.percent * 3.6}deg, var(--muted) 0deg)` }}>
                <div className="absolute inset-1 flex items-center justify-center rounded-full bg-card text-sm font-extrabold text-primary">{completion.percent}%</div>
              </div>
              <div className="text-xs text-muted-foreground"><div className="font-semibold text-foreground">Profile strength</div>{completion.recommendations[0] ?? "Looking great!"}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/candidate/jobs" className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90"><Search className="h-4 w-4" />Search Jobs</Link>
              <Link to="/candidate/profile" className={`${linkBtn} bg-card/70`}><UserCheck className="h-4 w-4" />Edit Profile</Link>
              <Link to="/candidate/applications" className={`${linkBtn} bg-card/70`}><FileText className="h-4 w-4" />Applications</Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 2xl:grid-cols-6">
        <Stat Icon={FileText} n={m.total} label="Total applications" />
        <Stat Icon={Briefcase} n={m.thisMonth} label="This month" />
        <Stat Icon={Target} n={m.active} label="Active" />
        <Stat Icon={Gift} n={m.offers} label="Offers" />
        <Stat Icon={CheckCircle2} n={m.hires} label="Hires" />
        <Stat Icon={CircleSlash} n={m.rejected} label="Not Moving Forward" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-6 xl:col-span-2">
          <Widget title="Application Status">
            <div className="space-y-2.5">
              {breakdown.map((b) => (
                <div key={b.key} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0 font-medium sm:w-36">{b.label}</span>
                  <div className="h-2 min-w-0 flex-1 rounded-full bg-muted"><div className="h-2 rounded-full bg-gradient-primary" style={{ width: `${(b.n / maxN) * 100}%` }} /></div>
                  <span className="w-6 shrink-0 text-right text-muted-foreground">{b.n}</span>
                </div>
              ))}
            </div>
          </Widget>

          <Widget title="Recent Applications" action={<Link to="/candidate/applications" className="text-xs font-semibold text-primary">View all</Link>}>
            {apps.length === 0 ? <Empty text="No applications yet." cta={<Link to="/candidate/jobs" className={linkBtn}>Search Jobs</Link>} /> : (
              <div className="space-y-2">
                {apps.slice(0, 5).map((a) => (
                  <div key={a.application_id} className="flex flex-col gap-2 rounded-xl border border-border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0"><div className="truncate text-sm font-semibold"><Link to="/candidate/jobs/$id" params={{ id: a.job_id }} className="hover:text-primary hover:underline underline-offset-2">{a.job_title}</Link>{a.company && ` · ${a.company}`}</div><div className="text-xs text-muted-foreground">Applied {fmt(a.application_date)}</div></div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">{statusLabel(a.application_status)}</span>
                      <Link to="/candidate/applications/$id" params={{ id: a.application_id }} className="text-xs font-semibold text-primary">View</Link>
                      <Link to="/candidate/jobs/$id" params={{ id: a.job_id }} className="text-xs font-semibold text-muted-foreground hover:text-primary">Job</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Widget>

          <Widget title="Saved Jobs" action={<Link to="/candidate/jobs/saved" className="text-xs font-semibold text-primary">View all ({data.saved.length})</Link>}>
            {data.saved.length === 0 ? <Empty text="No saved jobs yet." cta={<Link to="/candidate/jobs" className={linkBtn}>Explore Opportunities</Link>} /> : (
              <div className="space-y-2">
                {data.saved.slice(0, 4).map((s) => (
                  <div key={s.saved_job_id} className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5">
                    <div className="min-w-0"><div className="truncate text-sm font-semibold"><Link to="/candidate/jobs/$id" params={{ id: s.job_id }} className="hover:text-primary hover:underline underline-offset-2">{s.jobs?.job_title}</Link></div><div className="truncate text-xs text-muted-foreground">{s.jobs?.companies?.company_name} · Saved {fmt(s.saved_date)}</div></div>
                    <div className="flex items-center gap-2">
                      <Link to="/candidate/jobs/$id" params={{ id: s.job_id }} className="text-xs font-semibold text-primary">Continue review</Link>
                      <button aria-label="Remove saved job" onClick={() => removeSaved(s.saved_job_id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Widget>

          <CandidateRecsWidget uid={uid} />
          <MessagesWidget role="candidate" />

          <Widget title="Recent Activity">
            {activity.length === 0 ? <Empty text="No activity yet." cta={<Link to="/candidate/profile" className={linkBtn}>Complete Profile</Link>} /> : (
              <ol className="space-y-3 border-l border-border pl-4">
                {activity.map((a, i) => <li key={i} className="text-sm"><div className="font-medium">{a.text}</div><div className="text-xs text-muted-foreground">{fmt(a.at)}</div></li>)}
              </ol>
            )}
          </Widget>
        </div>

        <div className="grid min-w-0 content-start gap-6 md:grid-cols-2 xl:grid-cols-1">
          <Widget title="Profile Completion">
            <div className="flex justify-between text-sm"><span className="font-medium">Overall</span><span className="font-bold text-primary">{completion.percent}%</span></div>
            <div className="mt-1.5 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-gradient-primary" style={{ width: `${completion.percent}%` }} /></div>
            {completion.recommendations.length > 0 ? (
              <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">{completion.recommendations.slice(0, 3).map((r) => <li key={r}>• {r}</li>)}</ul>
            ) : <p className="mt-4 text-sm text-success">Your profile is complete.</p>}
          </Widget>

          <Widget title="Quick Actions">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-2">
              <Link to="/candidate/jobs" className={linkBtn}><Search className="h-4 w-4" />Search Jobs</Link>
              <Link to="/candidate/profile" className={linkBtn}><UserCheck className="h-4 w-4" />Edit Profile</Link>
              <Link to="/candidate/applications" className={linkBtn}><FileText className="h-4 w-4" />Applications</Link>
              <Link to="/candidate/jobs/saved" className={linkBtn}><Bookmark className="h-4 w-4" />Saved Jobs</Link>
              <Link to="/candidate/profile" className={linkBtn}><Sparkles className="h-4 w-4" />Update Skills</Link>
              <Link to="/candidate/profile" className={linkBtn}><Upload className="h-4 w-4" />Upload Resume</Link>
            </div>
          </Widget>

          <Widget title="Recruiter Activity">
            {recruiterEvents.length === 0 ? <p className="text-sm text-muted-foreground">No recruiter activity yet. Profile views will show here soon.</p> : (
              <div className="space-y-2 text-sm">{recruiterEvents.slice(0, 5).map((a) => <p key={a.application_id}><b>{a.company || a.job_title}</b> — {statusLabel(a.application_status)} <span className="text-xs text-muted-foreground">· {fmt(a.updated_at)}</span></p>)}</div>
            )}
          </Widget>

          <CandidateMatchWidget uid={uid} />

          <CareerWidget uid={uid} />

          <CandidateAnalyticsSnapshot uid={uid} />
          <NotificationWidget uid={uid} role="candidate" />
        </div>
      </div>
    </>
  );
}
