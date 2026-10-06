import { formatSalaryAmount } from "@/lib/salary";
import { SearchSelect } from "@/components/ui/search-select";
import { MessageButton } from "@/components/messages/Messages";
import { meetsMinMatch } from "@/lib/match-engine";
import { MatchBadge, MatchFilter, MatchPanel, useAutoRecalc, useRecalc, useScores } from "@/components/match/Match";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, FileText, GitBranch, LayoutGrid, List, MapPin, XCircle } from "lucide-react";
import { applyToJob, addToPipeline, listJobApplications, listMyApplications, loadJobApplication, loadMyApplication, markViewed, myApplicationFor, setApplicationStatus, withdrawApplication } from "@/lib/applications-data";
import { loadCandidateFull } from "@/lib/talent-data";
import { APP_STATUSES, CANDIDATE_BOARD, canApply, candidateBoardStage, timeline, type AppStatus } from "@/lib/talent-rules";
import { card, friendlyError, inputCls, label, AVAILABILITY } from "@/components/profile/parts";
import { DatePicker } from "@/components/ui/date-picker";
import { ARRANGEMENT, lbl } from "@/components/jobs/shared";
import { Avatar, CandidateProfileBody, Chips, ErrorBox, MatchPlaceholder, ProfileHeader, btn, nameOf, primaryBtn, useTaxonomy } from "@/components/talent/Talent";
import { listApplicationInterviews } from "@/lib/interviews-data";
import { InterviewCard } from "@/components/applications/Interviews";

const STATUS_STYLE: Record<string, string> = { applied: "bg-primary-soft text-primary", viewed: "bg-muted text-foreground", recruiter_contacted: "bg-primary-soft text-primary", interviewing: "bg-warning/15 text-warning", offer: "bg-success/15 text-success", hired: "bg-success text-primary-foreground", rejected: "bg-destructive/10 text-destructive" };
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
  const me = useQuery({ queryKey: ["candidate-full", uid], queryFn: () => loadCandidateFull(uid), enabled: open });
  const tax = useTaxonomy();
  const rule = canApply(jobStatus, !!existing.data);

  if (existing.data) return <Link to="/candidate/applications/$id" params={{ id: existing.data.application_id }} className={`${btn} border-success text-success`}><CheckCircle2 className="h-4 w-4" />Already Applied</Link>;
  async function submit() {
    setBusy(true);
    try { const a = await applyToJob(uid, jobId); setDone({ date: a.application_date }); toast.success("Application Submitted"); qc.invalidateQueries({ queryKey: ["my-applications"] }); }
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
                      <label className="mt-1 flex items-center gap-2"><input type="radio" checked={mode === "resume"} disabled={!p.resume_path} onChange={() => setMode("resume")} />Structured Profile + Resume{!p.resume_path && <span className="text-xs text-muted-foreground">(upload a resume first)</span>}</label></fieldset>
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
  const [co, setCo] = useState(""), [jt, setJt] = useState("");
  const [view, setView] = useState<"list" | "board">("list");
  const all = q.data ?? [];
  const companies = [...new Set(all.map((a) => a.jobs?.companies?.company_name).filter((x): x is string => !!x))].sort();
  const titles = [...new Set(all.filter((a) => !co || a.jobs?.companies?.company_name === co).map((a) => a.jobs?.job_title).filter((x): x is string => !!x))].sort();
  const rows = all.filter((a) => (!co || a.jobs?.companies?.company_name === co) && (!jt || a.jobs?.job_title === jt));
  const viewBtn = (on: boolean) => `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${on ? "bg-gradient-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"}`;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="font-display text-2xl font-extrabold sm:text-3xl">Applications</h1><p className="text-sm text-muted-foreground">Track every application in one place.</p></div>
        {all.length > 0 && <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="View" className="inline-flex rounded-xl border border-border bg-card p-1">
            <button onClick={() => setView("list")} aria-pressed={view === "list"} className={viewBtn(view === "list")}><List className="h-4 w-4" />List</button>
            <button onClick={() => setView("board")} aria-pressed={view === "board"} className={viewBtn(view === "board")}><LayoutGrid className="h-4 w-4" />Board</button>
          </div>
          <SearchSelect ariaLabel="Filter by company" value={co} onChange={(v) => { setCo(v); setJt(""); }} allLabel="All companies" placeholder="Search companies..." options={companies.map((c) => ({ value: c, label: c }))} />
          <SearchSelect ariaLabel="Filter by job" value={jt} onChange={setJt} allLabel="All jobs" placeholder="Search job titles..." options={titles.map((t) => ({ value: t, label: t }))} />
        </div>}</div>
      {q.error ? <ErrorBox msg="Unable To Load Applications" retry={() => q.refetch()} /> : q.isLoading ? <div className={`${card} h-48 animate-pulse`} />
        : !all.length ? <div className={`${card} p-10 text-center`}><FileText className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-3 font-display text-lg font-bold">No applications yet</p><Link to="/candidate/jobs" className={`${primaryBtn} mt-4`}>Browse jobs</Link></div>
        : !rows.length ? <div className={`${card} p-8 text-center text-sm text-muted-foreground`}>No applications match these filters. <button onClick={() => { setCo(""); setJt(""); }} className="font-semibold text-primary">Clear filters</button></div>
        : view === "board" ? (
          <div className="-mx-1 overflow-x-auto pb-2">
            <div className="flex min-w-max gap-4 px-1">{CANDIDATE_BOARD.map(([key, name]) => {
              const col = rows.filter((a) => candidateBoardStage(a.application_status) === key);
              return (
                <section key={key} aria-label={name} className="w-72 shrink-0 rounded-2xl border border-border bg-muted/40 p-3">
                  <h2 className="mb-3 flex items-center justify-between px-1 text-sm font-bold"><span className="flex items-center gap-2"><span className="h-3.5 w-1 rounded-full bg-gradient-primary" />{name}</span><span className="rounded-full bg-card px-2 py-0.5 text-xs text-muted-foreground">{col.length}</span></h2>
                  <div className="space-y-3">{col.length ? col.map((a) => (
                    <Link key={a.application_id} to="/candidate/applications/$id" params={{ id: a.application_id }} className="block rounded-xl border border-border bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40">
                      <p className="font-display font-bold leading-snug">{a.jobs?.job_title ?? "Job removed"}</p>
                      <p className="text-sm text-muted-foreground">{a.jobs?.companies?.company_name}</p>
                      <div className="mt-3 flex items-center justify-between gap-2"><AppStatusBadge s={a.application_status} /><span className="text-xs text-muted-foreground">{fmt(a.application_date)}</span></div>
                    </Link>)) : <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Nothing here yet</p>}</div>
                  {key === "interviewing" && col.length > 0 && <Link to="/candidate/interviews" className="mt-3 block text-center text-xs font-semibold text-primary hover:underline">See your interviews →</Link>}
                </section>);
            })}</div>
          </div>)
        : <div className={`${card} divide-y divide-border`}>{rows.map((a) => (
            <div key={a.application_id} className="flex flex-wrap items-center gap-4 p-5">
              <div className="min-w-0 flex-1"><p className="font-display font-bold">{a.jobs?.job_title ?? "Job removed"}</p><p className="text-sm text-muted-foreground">{a.jobs?.companies?.company_name}</p>
                <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{a.jobs?.location}</span>{a.jobs && <span>{lbl(ARRANGEMENT, a.jobs.work_arrangement)}</span>}<span>Applied {fmt(a.application_date)}</span></p></div>
              <AppStatusBadge s={a.application_status} />
              <div className="flex gap-2"><Link to="/candidate/applications/$id" params={{ id: a.application_id }} className={btn}>View Details</Link>{a.jobs && <Link to="/candidate/jobs/$id" params={{ id: a.jobs.job_id }} className={btn}>View Job</Link>}</div>
            </div>))}</div>}
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
      {(ivs.data ?? []).map((i) => <InterviewCard key={i.interview_id} i={i} title={`Interview: ${a.jobs?.job_title ?? "Job"} at ${a.jobs?.companies?.company_name ?? ""}`} />)}
      <div className={`${card} p-6`}><h2 className="font-display text-lg font-bold">Status Timeline</h2>
        <ol className="mt-5 space-y-4">{timeline(a.application_status as AppStatus).map((s) => (
          <li key={s.key} className="flex items-center gap-3">{s.state === "done" ? <CheckCircle2 className="h-5 w-5 text-success" /> : s.state === "rejected" ? <XCircle className="h-5 w-5 text-destructive" /> : <Circle className={`h-5 w-5 ${s.state === "current" ? "text-primary" : "text-muted-foreground"}`} />}
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
  const [f, setF] = useState({ co: "", job: "", status: "", since: "", mm: 0 });
  const coName = (a: { jobs: { companies: { company_name: string } | null } }) => a.jobs.companies?.company_name ?? "No company";
  const companies = useMemo(() => [...new Set((q.data ?? []).map(coName))].sort(), [q.data]);
  const jobs = useMemo(() => [...new Map((q.data ?? []).filter((a) => !f.co || coName(a) === f.co).map((a) => [a.job_id, f.co ? a.jobs.job_title : `${coName(a)} — ${a.jobs.job_title}`])).entries()], [q.data, f.co]);
  const rows = (q.data ?? []).filter((a) => (!f.co || coName(a) === f.co) && (!f.job || a.job_id === f.job) && (!f.status || a.application_status === f.status) && (!f.since || a.application_date >= f.since) && meetsMinMatch(scoreOf(a.candidate_id, a.job_id), f.mm));
  async function act(fn: () => Promise<void>, msg: string) { try { await fn(); toast.success(msg); qc.invalidateQueries({ queryKey: ["job-applications"] }); qc.invalidateQueries({ queryKey: ["pipeline"] }); } catch (e) { toast.error(friendlyError(e, e instanceof Error ? e.message : "Unable To Update Pipeline")); } }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="font-display text-2xl font-extrabold sm:text-3xl">Applications</h1><p className="text-sm text-muted-foreground">Review candidates who applied to your jobs.</p></div><Link to="/recruiter/pipeline" className={btn}><GitBranch className="h-4 w-4" />Pipeline</Link></div>
      <div className={`${card} grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4`}>
        <SearchSelect ariaLabel="Filter by company" value={f.co} onChange={(v) => setF({ ...f, co: v, job: "" })} allLabel="All companies" placeholder="Search companies..." options={companies.map((c) => ({ value: c, label: c }))} />
        <SearchSelect ariaLabel="Filter by job" value={f.job} onChange={(v) => setF({ ...f, job: v })} allLabel="All jobs" placeholder="Search job titles..." options={jobs.map(([id, t]) => ({ value: id, label: t }))} />
        <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className={inputCls} aria-label="Status"><option value="">All statuses</option>{APP_STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <DatePicker value={f.since} onChange={(v) => setF({ ...f, since: v })} aria-label="Applied since" placeholder="Applied since" />
        <div className="sm:col-span-2 lg:col-span-4"><MatchFilter value={f.mm} onChange={(mm) => setF({ ...f, mm })} /></div>
      </div>
      {q.error ? <ErrorBox msg="Unable To Load Applications" retry={() => q.refetch()} /> : q.isLoading || !tax.data ? <div className={`${card} h-48 animate-pulse`} />
        : !rows.length ? <div className={`${card} p-10 text-center`}><p className="font-display text-lg font-bold">No applications</p><p className="mt-1 text-sm text-muted-foreground">{q.data?.length ? "No applications match these filters." : "Applications to your active jobs will appear here."}</p></div>
        : <div className="grid gap-4 md:grid-cols-2">{rows.map((a) => (
            <article key={a.application_id} className={`${card} p-5`}>
              <div className="flex items-start gap-3"><Avatar name={a.name} size="h-11 w-11 text-sm" /><div className="min-w-0 flex-1"><p className="font-display font-bold">{a.name}</p><p className="text-sm">{a.candTitle} · {a.years} yrs</p><p className="text-xs text-muted-foreground">For <strong>{a.jobs.job_title}</strong> · {fmt(a.application_date)}{a.availability && ` · ${label(AVAILABILITY, a.availability)}`}</p></div><div className="flex flex-col items-end gap-1"><MatchBadge score={scoreOf(a.candidate_id, a.job_id)} /><AppStatusBadge s={a.application_status} /></div></div>
              <div className="mt-3 space-y-2"><Chips ids={a.skills} opts={tax.data!.skills} max={4} /><Chips ids={a.techs} opts={tax.data!.technologies} max={4} /></div>
              <div className="mt-4 flex flex-wrap gap-2"><Link to="/recruiter/applications/$id" params={{ id: a.application_id }} className={primaryBtn}>View Candidate</Link>
                <button onClick={() => act(() => addToPipeline(uid, a.candidate_id, a.job_id), "Candidate Moved To Pipeline")} className={btn}>Move To Pipeline</button>
                <MessageButton role="recruiter" candidateId={a.candidate_id} jobId={a.job_id} className={btn} />
                {a.application_status !== "rejected" && <button onClick={() => act(() => setApplicationStatus(a.application_id, "rejected"), "Candidate Rejected")} className={`${btn} hover:border-destructive hover:text-destructive`}>Reject</button>}</div>
            </article>))}</div>}
    </div>
  );
}

export function RecruiterApplicationDetail({ uid, id }: { uid: string; id: string }) {
  const qc = useQueryClient();
  const tax = useTaxonomy();
  const app = useQuery({ queryKey: ["job-application", id], queryFn: () => loadJobApplication(id) });
  const cand = useQuery({ queryKey: ["candidate-full", app.data?.candidate_id], queryFn: () => loadCandidateFull(app.data!.candidate_id), enabled: !!app.data });
  useEffect(() => { if (app.data?.application_status === "applied") markViewed(id, "applied").then(() => { app.refetch(); qc.invalidateQueries({ queryKey: ["job-applications"] }); }).catch(() => {}); }, [app.data?.application_status]); // eslint-disable-line react-hooks/exhaustive-deps
  if (app.isLoading || cand.isLoading || tax.isLoading) return <div className={`${card} h-96 animate-pulse`} />;
  if (app.error || cand.error) return <ErrorBox msg="Unable To Load Applications" retry={() => { app.refetch(); cand.refetch(); }} />;
  if (!app.data || !cand.data || !tax.data || app.data.jobs?.recruiter_id !== uid) return <div className={`${card} p-10 text-center`}><p className="font-display text-lg font-bold">Access Denied</p><p className="text-sm text-muted-foreground">This application isn't available.</p><Link to="/recruiter/applications" className={`${primaryBtn} mt-4`}>Back</Link></div>;
  const a = app.data;
  async function update(s: AppStatus) {
    try { await setApplicationStatus(id, s); toast.success(s === "rejected" ? "Candidate Rejected" : s === "offer" ? "Offer Extended" : "Application Updated"); app.refetch(); qc.invalidateQueries({ queryKey: ["job-applications"] }); } catch (e) { toast.error(friendlyError(e, "Unable to update.")); }
  }
  async function toPipeline() { try { await addToPipeline(uid, a.candidate_id, a.job_id); toast.success("Candidate Moved To Pipeline"); qc.invalidateQueries({ queryKey: ["pipeline"] }); } catch (e) { toast.error(e instanceof Error ? e.message : "Unable To Update Pipeline"); } }
  return (
    <div className="space-y-6 pb-16">
      <Link to="/recruiter/applications" className="text-sm text-muted-foreground hover:text-primary">← All applications</Link>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-6"><ProfileHeader d={cand.data} /><CandidateProfileBody d={cand.data} t={tax.data} /></div>
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
