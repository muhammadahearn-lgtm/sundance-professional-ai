import { APP_SORTS, sortApplications } from "@/lib/application-sort";
import { supabase } from "@/integrations/supabase/client";
import { ProfilePhoto } from "@/components/app/ProfilePhoto";
import { formatSalaryAmount } from "@/lib/salary";
import { SearchSelect } from "@/components/ui/search-select";
import { MessageButton } from "@/components/messages/Messages";
import { meetsMinMatch } from "@/lib/match-engine";
import { MatchBadge, MatchFilter, MatchPanel, useAutoRecalc, useRecalc, useScores } from "@/components/match/Match";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, CheckCircle2, Circle, Clock, FileText, GitBranch, Lightbulb, MapPin, Send, Sparkles, Upload, XCircle } from "lucide-react";
import { loadTaxonomy } from "@/lib/jobs-data";
import { loadCandidateJob } from "@/lib/job-search-data";
import { listMyInterviews } from "@/lib/interviews-data";
import { CompanyLogo } from "@/components/candidate-jobs/JobCard";
import { HUB_TABS, INTRO_NOTE_MAX, hubCounts, matchesTab, nextStep, type HubTab } from "@/lib/application-hub";
import { validateResumeFile } from "@/lib/profile-completion";
import { loadScreeningQuestions, saveScreeningAnswers, loadScreeningAnswers } from "@/lib/applications-data";
import { answerFit, optionsFor, validateAnswers, type ScreeningQ } from "@/lib/screening";
import { applyToJob, addToPipeline, listJobApplications, listMyApplications, loadJobApplication, loadMyApplication, markViewed, myApplicationFor, myPendingOfferApps, sendIntroNote, setApplicationStatus, uploadResumeForApply, withdrawApplication } from "@/lib/applications-data";
import { loadCandidateFull } from "@/lib/talent-data";
import { APP_STATUSES, canApply, timeline, type AppStatus } from "@/lib/talent-rules";
import { card, friendlyError, inputCls, label, AVAILABILITY } from "@/components/profile/parts";
import { DatePicker } from "@/components/ui/date-picker";
import { ARRANGEMENT, lbl } from "@/components/jobs/shared";
import { Avatar, CandidateProfileBody, Chips, ErrorBox, MatchPlaceholder, ProfileHeader, btn, nameOf, primaryBtn, useTaxonomy } from "@/components/talent/Talent";
import { listApplicationInterviews } from "@/lib/interviews-data";
import { InterviewCard } from "@/components/applications/Interviews";
import { NotMovingForwardDialog } from "@/components/applications/NotMovingForwardDialog";
import { ApplicationInsights } from "@/components/applications/ApplicationInsights";
import { CandidateOfferCard } from "@/components/applications/Offers";

const STATUS_STYLE: Record<string, string> = { applied: "bg-primary-soft text-primary", viewed: "bg-muted text-foreground", recruiter_contacted: "bg-primary-soft text-primary", interviewing: "bg-warning/15 text-warning", offer: "bg-success/15 text-success", hired: "bg-success text-primary-foreground", rejected: "bg-muted text-muted-foreground" };
export function AppStatusBadge({ s }: { s: string }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[s] ?? "bg-muted"}`}>{label(APP_STATUSES, s)}</span>;
}
const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

/** Apply button + modal for the candidate job detail page. */
export function ApplyButton({ uid, jobId, jobStatus, jobTitle, company }: { uid: string; jobId: string; jobStatus: string; jobTitle: string; company: string }) {
  const qc = useQueryClient();
  const existing = useQuery({ queryKey: ["my-app", jobId], queryFn: () => myApplicationFor(uid, jobId) });
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"profile" | "resume">("profile");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ date: string } | null>(null);
  const me = useQuery({ queryKey: ["talent-candidate", uid], queryFn: () => loadCandidateFull(uid), enabled: open });
  const tax = useTaxonomy();
  const sq = useQuery({ queryKey: ["screening", jobId], queryFn: () => loadScreeningQuestions(jobId), enabled: open });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showErr, setShowErr] = useState(false);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  async function attach(file: File | undefined) {
    if (!file) return;
    const bad = validateResumeFile(file);
    if (bad) { toast.error(bad); return; }
    setUploading(true);
    try { await uploadResumeForApply(uid, file, me.data?.profile?.resume_path ?? null); await me.refetch(); setMode("resume"); toast.success("Resume attached"); }
    catch (e) { toast.error(friendlyError(e, "Resume upload failed. Please try again.")); }
    setUploading(false);
  }
  const ansErrs = validateAnswers(sq.data ?? [], answers);
  const rule = canApply(jobStatus, !!existing.data);

  if (existing.data) return <Link to="/candidate/applications/$id" params={{ id: existing.data.application_id }} className={`${btn} border-success text-success`}><CheckCircle2 className="h-4 w-4" />Already Applied</Link>;
  async function submit() {
    if (Object.keys(ansErrs).length) { setShowErr(true); toast.error("Please answer the screening questions."); return; }
    setBusy(true);
    try { const a = await applyToJob(uid, jobId);
      try { await saveScreeningAnswers(a.application_id, answers); } catch { toast.error("Application sent, but your screening answers couldn't be saved."); }
      if (note.trim()) { try { await sendIntroNote(uid, jobId, note.trim()); } catch { toast.error("Application sent, but your note couldn't be delivered."); } }
      setDone({ date: a.application_date }); toast.success("Application Submitted"); qc.invalidateQueries({ queryKey: ["my-applications"] }); }
    catch (e) { toast.error(e instanceof Error && e.message === "Already Applied" ? "Already Applied" : friendlyError(e, e instanceof Error ? e.message : "Application Failed")); }
    setBusy(false);
  }
  const close = () => { setOpen(false); if (done) qc.invalidateQueries({ queryKey: ["my-app", jobId] }); };
  const p = me.data?.profile;
  return (
    <>
      <button onClick={() => setOpen(true)} disabled={!rule.ok || existing.isLoading} title={rule.reason} className={primaryBtn}>{rule.ok ? "Apply" : rule.reason}</button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" role="dialog" aria-modal="true" aria-label="Apply to job">
          <div className={`${card} max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6`}>
            {done ? (
              <div className="text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-success" /><h2 className="mt-3 font-display text-xl font-extrabold">Application Submitted Successfully</h2>
                <dl className="mx-auto mt-5 grid max-w-sm grid-cols-2 gap-3 text-left text-sm"><dt className="text-muted-foreground">Job Title</dt><dd className="font-semibold">{jobTitle}</dd><dt className="text-muted-foreground">Company</dt><dd>{company}</dd><dt className="text-muted-foreground">Date Submitted</dt><dd>{fmt(done.date)}</dd><dt className="text-muted-foreground">Status</dt><dd><AppStatusBadge s="applied" /></dd></dl>
                <div className="mt-6 flex justify-center gap-2"><button onClick={close} className={btn}>Close</button><Link to="/candidate/applications" className={primaryBtn}>View Applications</Link></div></div>
            ) : (
              <>
                <h2 className="font-display text-xl font-extrabold">Apply to {jobTitle}</h2><p className="text-sm text-muted-foreground">{company}</p>
                {me.isLoading || !tax.data ? <div className="mt-5 h-40 animate-pulse rounded-xl bg-muted" /> : !me.data || !p ? <p className="mt-5 text-sm text-destructive">Complete your profile before applying.</p> : (
                  <div className="mt-5 space-y-4 text-sm">
                    <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-4"><Avatar name={me.data.name} /><div><p className="font-semibold">{me.data.name}</p><p className="text-muted-foreground">{p.job_title} · {p.years_experience} yrs · {p.location}</p></div></div>
                    <div className="rounded-xl border border-border p-4"><p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Application Package</p>
                      <p><strong>Headline:</strong> {p.headline || "—"}</p><p className="mt-1"><strong>Experience:</strong> {me.data.experience.length} role(s)</p>
                      <div className="mt-2"><strong>Skills:</strong> <Chips ids={me.data.skills.map((s) => s.lookup_id)} opts={tax.data.skills} max={6} /></div>
                      <div className="mt-2"><strong>Languages:</strong> <Chips ids={me.data.languages.map((s) => s.lookup_id)} opts={tax.data.languages} max={6} /></div>
                      <div className="mt-2"><strong>Technologies:</strong> <Chips ids={me.data.technologies.map((s) => s.lookup_id)} opts={tax.data.technologies} max={6} /></div>
                      <p className="mt-2"><strong>Preferences:</strong> {[p.target_roles.join(", "), formatSalaryAmount(p.salary_amount, p.salary_currency), label(AVAILABILITY, p.availability)].filter(Boolean).join(" · ") || "—"}</p>
                      <p className="mt-2"><strong>Resume:</strong> {p.resume_file_name ?? "None uploaded"}</p></div>
                    <fieldset><legend className="mb-2 font-semibold">Submit using</legend>
                      <label className="flex items-center gap-2"><input type="radio" checked={mode === "profile"} onChange={() => setMode("profile")} />Structured Profile</label>
                      <label className="mt-1 flex items-center gap-2"><input type="radio" checked={mode === "resume"} disabled={!p.resume_path} onChange={() => setMode("resume")} />Structured Profile + Resume</label>
                      <label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void attach(e.dataTransfer.files[0]); }} className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary-soft/40 p-4 transition-colors hover:bg-primary-soft">
                        <Upload className="h-5 w-5 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1"><span className="block font-semibold">{uploading ? "Uploading…" : p.resume_path ? "Replace your resume" : "Attach a resume"}</span><span className="block text-xs text-muted-foreground">{p.resume_path ? `Current: ${p.resume_file_name}` : "Drop a PDF or Word file here, or click to choose. It's saved to your profile too."}</span></span>
                        <input type="file" accept=".pdf,.doc,.docx" className="sr-only" disabled={uploading} onChange={(e) => { void attach(e.target.files?.[0]); e.target.value = ""; }} />
                      </label></fieldset>
                    <div><label htmlFor="intro-note" className="font-semibold">Note to the hiring team <span className="font-normal text-muted-foreground">(optional)</span></label>
                      <textarea id="intro-note" value={note} maxLength={INTRO_NOTE_MAX} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Why this role excites you, in a sentence or two." className={`${inputCls} mt-1.5 resize-none`} />
                      <p className="mt-1 text-right text-xs text-muted-foreground">{note.length}/{INTRO_NOTE_MAX} · sent as your first message</p></div>
                    {!!sq.data?.length && <ScreeningForm qs={sq.data} answers={answers} setAnswers={setAnswers} errs={showErr ? ansErrs : {}} />}
                    <label className="flex items-start gap-2"><input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-0.5" />I confirm my profile information is accurate and I want to apply.</label>
                  </div>
                )}
                <div className="mt-6 flex justify-end gap-2"><button onClick={close} className={btn}>Cancel</button><button onClick={submit} disabled={!confirm || busy || !p} className={primaryBtn}>{busy ? "Submitting…" : "Submit Application"}</button></div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function CandidateApplicationsPage({ uid }: { uid: string }) {
  const q = useQuery({ queryKey: ["my-applications", uid], queryFn: () => listMyApplications(uid) });
  const ivs = useQuery({ queryKey: ["my-interviews-hub", uid], queryFn: () => listMyInterviews(uid, "candidate") });
  const offers = useQuery({ queryKey: ["my-pending-offers", uid], queryFn: () => myPendingOfferApps(uid) });
  const [tab, setTab] = useState<HubTab>("all");
  const [co, setCo] = useState("");
  const all = q.data ?? [];
  const counts = hubCounts(all.map((a) => a.application_status));
  const companies = [...new Set(all.map((a) => a.jobs?.companies?.company_name).filter((x): x is string => !!x))].sort();
  const rows = all.filter((a) => matchesTab(a.application_status, tab) && (!co || a.jobs?.companies?.company_name === co));
  const now = Date.now();
  const nextIv = (appId: string) => (ivs.data ?? []).find((i) => i.application_id === appId && new Date(i.scheduled_at).getTime() > now);
  const stats = [
    { k: "In Review", v: counts.active, icon: Clock, tone: "text-primary bg-primary-soft" },
    { k: "Interviewing", v: counts.interviewing, icon: CalendarDays, tone: "text-warning bg-warning/15" },
    { k: "Offers", v: counts.offers, icon: Sparkles, tone: "text-success bg-success/15" },
    { k: "Total Submitted", v: counts.all, icon: Send, tone: "text-foreground bg-muted" },
  ];
  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-extrabold sm:text-3xl">Applications</h1><p className="text-sm text-muted-foreground">Every role you've applied to, and what happens next.</p></div>
      {all.length > 0 && <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{stats.map((s) => (
        <div key={s.k} className={`${card} flex items-center gap-3 p-4`}><span className={`grid h-10 w-10 place-items-center rounded-xl ${s.tone}`}><s.icon className="h-5 w-5" /></span><div><p className="font-display text-2xl font-extrabold leading-none">{s.v}</p><p className="mt-1 text-xs text-muted-foreground">{s.k}</p></div></div>))}</div>}
      {all.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Filter applications" className="flex flex-wrap gap-1.5 rounded-2xl border border-border bg-card p-1">{HUB_TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors ${tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{t.label}<span className="ml-1.5 text-xs opacity-75">{counts[t.key]}</span></button>))}</div>
        {companies.length > 1 && <select aria-label="Filter by company" value={co} onChange={(e) => setCo(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2 text-sm"><option value="">All companies</option>{companies.map((c) => <option key={c} value={c}>{c}</option>)}</select>}
      </div>}
      {q.error ? <ErrorBox msg="Unable To Load Applications" retry={() => q.refetch()} /> : q.isLoading ? <div className="grid gap-3">{[0, 1, 2].map((i) => <div key={i} className={`${card} h-28 animate-pulse`} />)}</div>
        : !all.length ? <div className={`${card} p-10 text-center`}><FileText className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-3 font-display text-lg font-bold">No applications yet</p><p className="mt-1 text-sm text-muted-foreground">Find a role that fits and apply in a couple of clicks.</p><Link to="/candidate/jobs" className={`${primaryBtn} mt-4`}>Browse jobs</Link></div>
        : !rows.length ? <div className={`${card} p-8 text-center text-sm text-muted-foreground`}>Nothing here yet. <button onClick={() => { setTab("all"); setCo(""); }} className="font-semibold text-primary">Show all applications</button></div>
        : <div className="grid gap-3">{rows.map((a) => {
            const iv = nextIv(a.application_id), offer = offers.data?.has(a.application_id) ?? false;
            const step = nextStep(a.application_status, !!iv, offer);
            return (
              <div key={a.application_id} className={`${card} flex flex-wrap items-center gap-4 p-5 transition-shadow hover:shadow-md ${offer ? "border-success/40" : ""}`}>
                <CompanyLogo path={a.jobs?.companies?.logo_url} size="h-12 w-12" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><Link to="/candidate/applications/$id" params={{ id: a.application_id }} className="font-display font-bold hover:text-primary">{a.jobs?.job_title ?? "Job removed"}</Link><AppStatusBadge s={a.application_status} /></div>
                  <p className="text-sm text-muted-foreground">{a.jobs?.companies?.company_name}</p>
                  <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">{a.jobs?.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{a.jobs.location}</span>}{a.jobs && <span>{lbl(ARRANGEMENT, a.jobs.work_arrangement)}</span>}<span>Applied {fmt(a.application_date)}</span></p>
                  <p className={`mt-2 inline-flex items-center gap-1.5 text-xs font-semibold ${offer ? "text-success" : iv ? "text-warning" : "text-primary"}`}><Sparkles className="h-3.5 w-3.5" />{step}{iv && ` · ${new Date(iv.scheduled_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {offer ? <Link to="/candidate/applications/$id" params={{ id: a.application_id }} className={primaryBtn}>Review Offer</Link>
                    : <Link to="/candidate/applications/$id" params={{ id: a.application_id }} className={btn}>View Timeline</Link>}
                  {a.jobs && <MessageButton role="candidate" candidateId={uid} jobId={a.jobs.job_id} className={btn} />}
                </div>
              </div>);
          })}</div>}
    </div>
  );
}

function PrepCard({ jobId }: { jobId: string }) {
  const tax = useQuery({ queryKey: ["taxonomy"], queryFn: loadTaxonomy, staleTime: 5 * 60_000 });
  const q = useQuery({ queryKey: ["candidate-job", jobId], queryFn: () => loadCandidateJob(jobId) });
  if (!q.data || !tax.data) return null;
  const name = (ids: { id: string }[], opts: { id: string; name: string }[]) => ids.map((x) => opts.find((o) => o.id === x.id)?.name).filter(Boolean).slice(0, 8) as string[];
  const stack = [...name(q.data.languages, tax.data.languages), ...name(q.data.skills, tax.data.skills), ...name(q.data.technologies, tax.data.technologies)].slice(0, 12);
  const c = q.data.company;
  return (
    <div className={`${card} relative overflow-hidden p-6`}>
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Lightbulb className="h-5 w-5 text-primary" />Interview Prep</h2>
      <p className="mt-1 text-sm text-muted-foreground">A quick refresher on what this team cares about.</p>
      {stack.length > 0 && <><p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Core stack to brush up on</p><div className="mt-2 flex flex-wrap gap-1.5">{stack.map((s) => <span key={s} className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">{s}</span>)}</div></>}
      {c && !q.data.job.is_confidential && (c.why_work_here || c.description) && <><p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">About {c.company_name}</p><p className="mt-1 line-clamp-4 whitespace-pre-line text-sm">{c.why_work_here || c.description}</p></>}
      <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
        <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Prepare one project story for each core skill above.</li>
        <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Re-read your screening answers below so your story stays consistent.</li>
        <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Bring two questions about the team and how success is measured.</li>
      </ul>
    </div>
  );
}

export function CandidateApplicationDetail({ id, uid }: { id: string; uid: string }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["my-application", id], queryFn: () => loadMyApplication(id) });
  const ivs = useQuery({ queryKey: ["app-interviews", id], queryFn: () => listApplicationInterviews(id) });
  const [busy, setBusy] = useState(false);
  if (q.isLoading) return <div className={`${card} h-72 animate-pulse`} />;
  if (q.error) return <ErrorBox msg="Unable To Load Applications" retry={() => q.refetch()} />;
  if (!q.data) return <div className={`${card} p-10 text-center`}><p className="font-semibold">Application not found.</p><Link to="/candidate/applications" className={`${primaryBtn} mt-4`}>Back</Link></div>;
  const a = q.data;
  async function withdraw() {
    if (!confirm("Withdraw this application? This cannot be undone.")) return;
    setBusy(true);
    try { await withdrawApplication(id); toast.success("Application withdrawn"); qc.invalidateQueries({ queryKey: ["my-applications"] }); history.back(); } catch (e) { toast.error(friendlyError(e, "Couldn't withdraw.")); }
    setBusy(false);
  }
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/candidate/applications" className="text-sm text-muted-foreground hover:text-primary">← All applications</Link>
      <div className={`${card} p-6`}><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="font-display text-2xl font-extrabold">{a.jobs?.job_title}</h1><p>{a.jobs?.companies?.company_name}</p><p className="text-sm text-muted-foreground">Applied {fmt(a.application_date)} · Updated {fmt(a.updated_at)}</p></div><AppStatusBadge s={a.application_status} /></div>
        <div className="mt-4 flex gap-2">{a.jobs && <Link to="/candidate/jobs/$id" params={{ id: a.jobs.job_id }} className={btn}>View Job</Link>}{a.jobs && <MessageButton role="candidate" candidateId={uid} jobId={a.jobs.job_id} className={btn} />}{["applied", "viewed"].includes(a.application_status) && <button onClick={withdraw} disabled={busy} className={btn}>Withdraw Application</button>}</div></div>
      {a.application_status === "rejected" && <div className={`${card} border-primary/20 bg-primary-soft/40 p-5 text-sm`}><p className="font-semibold">Thank you for your interest in this role.</p><p className="mt-1 text-muted-foreground">The hiring team has decided not to move forward for this specific opening. Your profile stays active and ready to match with other opportunities.</p><Link to="/candidate/jobs" className={`${btn} mt-3`}>Explore matching jobs</Link></div>}
      <HiringLeadCard applicationId={id} status={a.application_status} />
      {a.job_id && <CandidateOfferCard applicationId={id} uid={uid} jobId={a.job_id} jobTitle={a.jobs?.job_title ?? "this role"} />}
      <ApplicationInsights applicationId={id} status={a.application_status} />
      {a.job_id && ["applied", "viewed", "recruiter_contacted", "interviewing"].includes(a.application_status) && <PrepCard jobId={a.job_id} />}
      {a.job_id && <ScreeningAnswers applicationId={id} jobId={a.job_id} />}
      {(ivs.data ?? []).map((i) => <InterviewCard key={i.interview_id} i={i} title={`Interview: ${a.jobs?.job_title ?? "Job"} at ${a.jobs?.companies?.company_name ?? ""}`} />)}
      <div className={`${card} p-6`}><h2 className="font-display text-lg font-bold">Status Timeline</h2>
        <ol className="mt-5 space-y-4">{timeline(a.application_status as AppStatus).map((s) => (
          <li key={s.key} className="flex items-center gap-3">{s.state === "done" ? <CheckCircle2 className="h-5 w-5 text-success" /> : s.state === "rejected" ? <XCircle className="h-5 w-5 text-muted-foreground" /> : <Circle className={`h-5 w-5 ${s.state === "current" ? "text-primary" : "text-muted-foreground"}`} />}
            <span className={`font-medium ${s.state === "pending" ? "text-muted-foreground" : ""}`}>{s.label}</span><span className="ml-auto text-xs text-muted-foreground">{s.state === "done" ? "✓" : s.state === "current" ? "Current" : s.state === "rejected" ? "Closed" : "Pending"}</span></li>))}</ol></div>
    </div>
  );
}

export function RecruiterApplicationsPage({ uid }: { uid: string }) {
  const qc = useQueryClient();
  const tax = useTaxonomy();
  const q = useQuery({ queryKey: ["job-applications", uid], queryFn: () => listJobApplications(uid) });
  useAutoRecalc();
  const scores = useScores({});
  const scoreOf = (c: string, j: string) => scores.data?.find((r) => r.candidate_id === c && r.job_id === j)?.overall_match_score;
  const [f, setF] = useState({ co: "", job: "", tf: "", mm: 0, sort: "match", unrev: false });
  const coName = (a: { jobs: { companies: { company_name: string } | null } }) => a.jobs.companies?.company_name ?? "No company";
  const companies = useMemo(() => [...new Set((q.data ?? []).map(coName))].sort(), [q.data]);
  const jobs = useMemo(() => [...new Map((q.data ?? []).filter((a) => !f.co || coName(a) === f.co).map((a) => [a.job_id, f.co ? a.jobs.job_title : `${coName(a)} — ${a.jobs.job_title}`])).entries()], [q.data, f.co]);
  const cutoff = f.tf ? new Date(Date.now() - Number(f.tf) * 86_400_000).toISOString() : "";
  const rows = sortApplications((q.data ?? []).filter((a) => (!f.co || coName(a) === f.co) && (!f.job || a.job_id === f.job) && (!cutoff || a.application_date >= cutoff) && (!f.unrev || a.application_status === "applied") && meetsMinMatch(scoreOf(a.candidate_id, a.job_id), f.mm)), f.sort, (a) => scoreOf(a.candidate_id, a.job_id), (a) => a.years);
  const [closing, setClosing] = useState<{ id: string; name: string; job: string } | null>(null);
  async function act(fn: () => Promise<void>, msg: string) { try { await fn(); toast.success(msg); qc.invalidateQueries({ queryKey: ["job-applications"] }); qc.invalidateQueries({ queryKey: ["pipeline"] }); } catch (e) { toast.error(friendlyError(e, e instanceof Error ? e.message : "Unable To Update Pipeline")); } }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="font-display text-2xl font-extrabold sm:text-3xl">Applications</h1><p className="text-sm text-muted-foreground">Review candidates who applied to your jobs.</p></div><Link to="/recruiter/pipeline" className={btn}><GitBranch className="h-4 w-4" />Pipeline</Link></div>
      <div className={`${card} grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4`}>
        <select value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value })} className={inputCls} aria-label="Sort by">{APP_SORTS.map(([k, l]) => <option key={k} value={k}>Sort: {l}</option>)}</select>
        <SearchSelect ariaLabel="Filter by company" value={f.co} onChange={(v) => setF({ ...f, co: v, job: "" })} allLabel="All companies" placeholder="Search companies..." options={companies.map((c) => ({ value: c, label: c }))} />
        <SearchSelect ariaLabel="Filter by job" value={f.job} onChange={(v) => setF({ ...f, job: v })} allLabel="All jobs" placeholder="Search job titles..." options={jobs.map(([id, t]) => ({ value: id, label: t }))} />
        <select value={f.tf} onChange={(e) => setF({ ...f, tf: e.target.value })} className={inputCls} aria-label="Applied timeframe">{TIMEFRAMES.map(([k, l]) => <option key={k} value={k}>Applied: {l}</option>)}</select>
        <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2 lg:col-span-4">
          <div className="min-w-0 flex-1"><MatchFilter value={f.mm} onChange={(mm) => setF({ ...f, mm })} /></div>
          <button type="button" role="switch" aria-checked={f.unrev} onClick={() => setF({ ...f, unrev: !f.unrev })}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${f.unrev ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary hover:text-primary"}`}>
            Unreviewed only
          </button>
        </div>
      </div>
      {q.error ? <ErrorBox msg="Unable To Load Applications" retry={() => q.refetch()} /> : q.isLoading || !tax.data ? <div className={`${card} h-48 animate-pulse`} />
        : !rows.length ? <div className={`${card} p-10 text-center`}><p className="font-display text-lg font-bold">No applications</p><p className="mt-1 text-sm text-muted-foreground">{q.data?.length ? "No applications match these filters." : "Applications to your active jobs will appear here."}</p></div>
        : <div className="grid gap-4 md:grid-cols-2">{rows.map((a) => (
            <article key={a.application_id} className={`${card} p-5`}>
              <div className="flex items-start gap-3"><Avatar name={a.name} size="h-11 w-11 text-sm" /><div className="min-w-0 flex-1"><p className="font-display font-bold"><Link to="/recruiter/candidates/$id" params={{ id: a.candidate_id }} className="hover:text-primary hover:underline underline-offset-2">{a.name}</Link></p><p className="text-sm">{a.candTitle} · {a.years} yrs</p><p className="text-xs text-muted-foreground">For <Link to="/recruiter/jobs/$id" params={{ id: a.job_id }} className="font-semibold hover:text-primary hover:underline underline-offset-2">{a.jobs.job_title}</Link> · {fmt(a.application_date)}{a.availability && ` · ${label(AVAILABILITY, a.availability)}`}</p></div><div className="flex flex-col items-end gap-1"><MatchBadge score={scoreOf(a.candidate_id, a.job_id)} /><AppStatusBadge s={a.application_status} /></div></div>
              <div className="mt-3 space-y-2"><Chips ids={a.skills} opts={tax.data!.skills} max={4} /><Chips ids={a.techs} opts={tax.data!.technologies} max={4} /></div>
              <div className="mt-4 flex flex-wrap gap-2"><Link to="/recruiter/applications/$id" params={{ id: a.application_id }} className={primaryBtn}>View Candidate</Link>
                <button onClick={() => act(() => addToPipeline(uid, a.candidate_id, a.job_id), "Candidate Moved To Pipeline")} className={btn}>Move To Pipeline</button>
                <MessageButton role="recruiter" candidateId={a.candidate_id} jobId={a.job_id} className={btn} />
                {a.application_status !== "rejected" && <button onClick={() => setClosing({ id: a.application_id, name: a.name, job: a.jobs.job_title })} className={btn}>Not Moving Forward</button>}</div>
            </article>))}</div>}
      {closing && <NotMovingForwardDialog name={closing.name} jobTitle={closing.job} onCancel={() => setClosing(null)} onConfirm={() => { const c = closing; setClosing(null); act(() => setApplicationStatus(c.id, "rejected"), "Marked Not Moving Forward"); }} />}
    </div>
  );
}

export function RecruiterApplicationDetail({ uid, id }: { uid: string; id: string }) {
  const qc = useQueryClient();
  const tax = useTaxonomy();
  const app = useQuery({ queryKey: ["job-application", id], queryFn: () => loadJobApplication(id) });
  const cand = useQuery({ queryKey: ["talent-candidate", app.data?.candidate_id], queryFn: () => loadCandidateFull(app.data!.candidate_id), enabled: !!app.data });
  useEffect(() => { if (app.data?.application_status === "applied") markViewed(id, "applied").then(() => { app.refetch(); qc.invalidateQueries({ queryKey: ["job-applications"] }); }).catch(() => {}); }, [app.data?.application_status]); // eslint-disable-line react-hooks/exhaustive-deps
  const [closingDetail, setClosingDetail] = useState(false);
  if (app.isLoading || cand.isLoading || tax.isLoading) return <div className={`${card} h-96 animate-pulse`} />;
  if (app.error || cand.error) return <ErrorBox msg="Unable To Load Applications" retry={() => { app.refetch(); cand.refetch(); }} />;
  if (!app.data || !cand.data || !tax.data || app.data.jobs?.recruiter_id !== uid) return <div className={`${card} p-10 text-center`}><p className="font-display text-lg font-bold">Access Denied</p><p className="text-sm text-muted-foreground">This application isn't available.</p><Link to="/recruiter/applications" className={`${primaryBtn} mt-4`}>Back</Link></div>;
  const a = app.data;
  async function update(s: AppStatus, confirmed = false) {
    if (s === "rejected" && !confirmed) { setClosingDetail(true); return; }
    try { await setApplicationStatus(id, s); toast.success(s === "rejected" ? "Marked Not Moving Forward" : s === "offer" ? "Offer Extended" : "Application Updated"); app.refetch(); qc.invalidateQueries({ queryKey: ["job-applications"] }); } catch (e) { toast.error(friendlyError(e, "Unable to update.")); }
  }
  async function toPipeline() { try { await addToPipeline(uid, a.candidate_id, a.job_id); toast.success("Candidate Moved To Pipeline"); qc.invalidateQueries({ queryKey: ["pipeline"] }); } catch (e) { toast.error(e instanceof Error ? e.message : "Unable To Update Pipeline"); } }
  return (
    <div className="space-y-6 pb-16">
      <Link to="/recruiter/applications" className="text-sm text-muted-foreground hover:text-primary">← All applications</Link>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-6"><ProfileHeader d={cand.data} /><ScreeningAnswers applicationId={id} jobId={a.job_id} recruiter /><CandidateProfileBody d={cand.data} t={tax.data} /></div>
        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <AppMatch candidateId={a.candidate_id} jobId={a.job_id} />
          <div className={`${card} space-y-3 p-5`}><p className="font-display font-bold">Application Status</p><p className="text-sm text-muted-foreground">For {a.jobs?.job_title} · applied {fmt(a.application_date)}</p>
            <select value={a.application_status} onChange={(e) => update(e.target.value as AppStatus)} className={inputCls} aria-label="Application status">{APP_STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            <button onClick={toPipeline} className={`${primaryBtn} w-full justify-center`}>Move To Pipeline</button>
            <MessageButton role="recruiter" candidateId={a.candidate_id} jobId={a.job_id} className={`${btn} w-full justify-center`} />
            {a.job_id && <Link to="/recruiter/pipeline/$jobId" params={{ jobId: a.job_id }} className={`${btn} w-full justify-center`}>Job Pipeline</Link>}</div>
          <MatchPlaceholder />
        </aside>
      </div>
      {closingDetail && <NotMovingForwardDialog name={cand.data.name} jobTitle={a.jobs?.job_title} onCancel={() => setClosingDetail(false)} onConfirm={() => { setClosingDetail(false); update("rejected", true); }} />}
    </div>
  );
}
export { nameOf };

function AppMatch({ candidateId, jobId }: { candidateId: string; jobId: string }) {
  const r = useRecalc();
  const q = useScores({ jobIds: [jobId] });
  const row = q.data?.find((x) => x.candidate_id === candidateId);
  return <MatchPanel title="Candidate Match" row={row} loading={q.isLoading} recalculating={r.isPending} onRecalc={() => r.mutate(jobId, { onSuccess: () => toast.success("Job Re-Evaluated") })} />;
}

function ScreeningForm({ qs, answers, setAnswers, errs }: { qs: ScreeningQ[]; answers: Record<string, string>; setAnswers: (f: (p: Record<string, string>) => Record<string, string>) => void; errs: Record<string, string> }) {
  return (
    <fieldset className="rounded-xl border border-border p-4"><legend className="px-1 text-xs font-semibold uppercase text-muted-foreground">Screening Questions</legend>
      <div className="space-y-4">{qs.map((q, i) => {
        const opts = optionsFor(q); const v = answers[q.id] ?? ""; const set = (x: string) => setAnswers((p) => ({ ...p, [q.id]: x }));
        return (
          <div key={q.id}><p className="font-medium">{i + 1}. {q.text}{q.required ? <span className="text-destructive"> *</span> : <span className="text-xs text-muted-foreground"> (optional)</span>}</p>
            {opts.length ? <div role="radiogroup" aria-label={q.text} className="mt-2 flex flex-wrap gap-2">{opts.map((o) => <button key={o} type="button" role="radio" aria-checked={v === o} onClick={() => set(o)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${v === o ? "border-primary bg-primary-soft text-primary" : "border-border hover:border-primary"}`}>{o}</button>)}</div>
              : <textarea aria-label={q.text} rows={2} maxLength={1000} className={`${inputCls} mt-2`} value={v} onChange={(e) => set(e.target.value)} />}
            {errs[q.id] && <p className="mt-1 text-xs text-destructive">{errs[q.id]}</p>}</div>);
      })}</div>
    </fieldset>
  );
}

/** Screening Q&A for an application; recruiter view highlights answers that differ from the preferred answer. */
export function ScreeningAnswers({ applicationId, jobId, recruiter }: { applicationId: string; jobId: string; recruiter?: boolean }) {
  const q = useQuery({ queryKey: ["screening-answers", applicationId], queryFn: () => loadScreeningAnswers(applicationId, jobId) });
  if (!q.data?.length) return null;
  return (
    <div className={`${card} p-6`}><h2 className="font-display text-lg font-bold">Screening Answers</h2>
      <dl className="mt-4 space-y-3 text-sm">{q.data.map(({ q: sq, answer }) => {
        const fit = recruiter ? answerFit(sq, answer) : null;
        return (<div key={sq.id}><dt className="text-muted-foreground">{sq.text}</dt>
          <dd className="mt-0.5 flex items-center gap-2 font-medium">{answer || <span className="text-muted-foreground">Not answered</span>}
            {fit === "match" && <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">Preferred</span>}
            {fit === "mismatch" && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">Differs from preferred ({sq.ideal})</span>}</dd></div>);
      })}</dl>
    </div>
  );
}

/** Recruiter card shown to the candidate once they're in the hiring pipeline (DB-gated by application_hiring_lead). */
function HiringLeadCard({ applicationId, status }: { applicationId: string; status: string }) {
  const open = ["recruiter_contacted", "interviewing", "offer", "hired"].includes(status);
  const q = useQuery({
    queryKey: ["hiring-lead", applicationId, status],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("application_hiring_lead", { _application_id: applicationId });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
  if (!open || !q.data) return null;
  const r = q.data;
  const meta = [r.specialization, r.years_experience ? `${r.years_experience} years recruiting` : ""].filter(Boolean).join(" · ");
  return (
    <div className={`${card} p-6`}>
      <h2 className="font-display text-lg font-bold">Your Hiring Lead</h2>
      <div className="mt-4 flex items-center gap-4">
        <ProfilePhoto uid={r.recruiter_id} path={r.avatar_path} initials={`${r.first_name?.[0] ?? ""}${r.last_name?.[0] ?? ""}`.toUpperCase() || "R"} className="h-14 w-14 text-lg" />
        <div className="min-w-0">
          <p className="font-semibold">{r.first_name} {r.last_name}</p>
          <p className="text-sm text-muted-foreground">{[r.title, r.company_name].filter(Boolean).join(" at ")}</p>
          {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
        </div>
      </div>
    </div>
  );
}
