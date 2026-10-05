import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Building2, Check } from "lucide-react";
import type { Account } from "@/lib/account";
import { DESCRIPTION_MAX, emptyJob, validateAll, validateStep, type JobForm, type JobStatus } from "@/lib/job-rules";
import { useRecalc } from "@/components/match/Match";
import { loadJob, loadMyCompany, loadTaxonomy, saveJob, toForm } from "@/lib/jobs-data";
import { Field, card, friendlyError, inputCls } from "@/components/profile/parts";
import { MarkdownEditor } from "./Markdown";
import { digitsOnly } from "@/lib/salary";
import { displayJobTitle } from "@/lib/role-taxonomy";
import { SearchPicker } from "@/components/taxonomy/SearchPicker";
import { ARRANGEMENT, CURRENCIES, EMPLOYMENT, RequirementPicker } from "./shared";

const STEPS = ["Job Information", "Programming Languages", "Technical Skills", "Tools & Technologies", "Compensation"];

async function loadWizard(uid: string, jobId?: string) {
  const [tax, company, existing] = await Promise.all([loadTaxonomy(), loadMyCompany(uid), jobId ? loadJob(jobId) : Promise.resolve(null)]);
  return { tax, company, existing };
}

export function JobWizard({ account, jobId }: { account: Account; jobId?: string | undefined }) {
  const uid = account.userId;
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["job-wizard", uid, jobId ?? "new"], queryFn: () => loadWizard(uid, jobId), staleTime: 0 });
  if (isLoading) return <div className={`${card} h-96 animate-pulse`} />;
  if (error || !data) return (
    <div className={`${card} p-8 text-center`}><p className="font-semibold">{friendlyError(error, "We couldn't load the job form.")}</p>
      <button onClick={() => refetch()} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Try again</button></div>
  );
  if (jobId && !data.existing) return <div className={`${card} p-8 text-center`}>This job doesn't exist or you don't have access to it.</div>;
  if (data.existing?.job.job_status === "closed") return (
    <div className={`${card} p-8 text-center`}><p className="font-semibold">Closed jobs are read-only.</p><p className="mt-1 text-sm text-muted-foreground">Duplicate it to create a new draft instead.</p>
      <Link to="/recruiter/jobs/$id" params={{ id: jobId! }} className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Back to job</Link></div>
  );
  if (!data.company && !data.existing) return (
    <div className={`${card} mx-auto max-w-xl p-8 text-center`}>
      <Building2 className="mx-auto h-10 w-10 text-primary" />
      <p className="mt-3 font-display text-lg font-bold">Set up your company first</p>
      <p className="mt-1 text-sm text-muted-foreground">Every job is linked to your company profile so candidates see who they'd work for.</p>
      <Link to="/recruiter/company" className="mt-5 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Set up company</Link>
    </div>
  );
  const initial = data.existing ? toForm(data.existing) : emptyJob(data.company?.company_id ?? "");
  return <Wizard uid={uid} jobId={jobId} initial={initial} status={data.existing?.job.job_status ?? "draft"} companyName={data.company?.company_name ?? ""} tax={data.tax} />;
}

function Wizard({ uid, jobId, initial, status, companyName, tax }: { uid: string; jobId?: string | undefined; initial: JobForm; status: JobStatus; companyName: string; tax: Awaited<ReturnType<typeof loadTaxonomy>> }) {
  const [step, setStep] = useState(1);
  const [f, setF] = useState(initial);
  const [errs, setErrs] = useState<ReturnType<typeof validateStep>>({});
  const [saving, setSaving] = useState<JobStatus | "save" | null>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const set = <K extends keyof JobForm>(k: K, v: JobForm[K]) => setF((p) => ({ ...p, [k]: v }));

  const next = () => {
    const e = validateStep(step, f); setErrs(e);
    if (Object.keys(e).length) { toast.error(e.maximum_salary?.includes("greater") ? "Invalid salary range." : "Missing required fields."); return; }
    setStep(step + 1); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const recalc = useRecalc();
  const submit = async (target: JobStatus | "save") => {
    const e = validateAll(f); setErrs(e);
    if (Object.keys(e).length) {
      const firstBad = [1, 2, 3, 4, 5].find((s) => Object.keys(validateStep(s, f)).length) ?? step;
      setStep(firstBad);
      toast.error(e.maximum_salary?.includes("greater") ? "Invalid salary range." : "Missing required fields.");
      return;
    }
    setSaving(target);
    try {
      const title = displayJobTitle(f.custom_title, tax.levels.find((l) => l.id === f.level_id)?.name, tax.allRoles.find((r) => r.id === f.role_id)?.name);
      const lvl = tax.levels.find((l) => l.id === f.level_id)?.name ?? "";
      const id = await saveJob(uid, { ...f, job_title: title, experience_level: lvl }, { id: jobId, status: target === "save" ? undefined : target });
      recalc.mutate(id);
      await qc.invalidateQueries({ queryKey: ["jobs"] });
      await qc.invalidateQueries({ queryKey: ["job", id] });
      toast.success(target === "active" && status !== "active" ? "Job published" : jobId ? "Job updated" : "Job created");
      navigate({ to: "/recruiter/jobs/$id", params: { id } });
    } catch (err) {
      toast.error(friendlyError(err, jobId ? "Unable to save changes." : "Job creation failed."));
    } finally { setSaving(null); }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to={jobId ? "/recruiter/jobs/$id" : "/recruiter/jobs"} params={jobId ? { id: jobId } : {}} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" />{jobId ? "Back to job" : "All jobs"}</Link>
          <h1 className="mt-1 font-display text-2xl font-extrabold">{jobId ? "Edit Job" : "Create Job"}</h1>
        </div>
      </div>

      <div className={`${card} p-5`}>
        <div className="flex items-center justify-between text-sm"><span className="font-semibold">Step {step} of 5</span><span className="text-muted-foreground">{STEPS[step - 1]}</span></div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(step / 5) * 100}%` }} /></div>
        <ol className="mt-4 hidden grid-cols-5 gap-2 sm:grid">
          {STEPS.map((s, i) => (
            <li key={s}><button type="button" onClick={() => (i + 1 < step || jobId) && setStep(i + 1)} className={`flex w-full items-center gap-2 text-left text-xs font-medium ${i + 1 === step ? "text-primary" : "text-muted-foreground"}`}>
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${i + 1 < step ? "bg-primary text-primary-foreground" : i + 1 === step ? "border-2 border-primary" : "border border-border"}`}>{i + 1 < step ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>{s}
            </button></li>
          ))}
        </ol>
      </div>

      <div className={`${card} p-5 sm:p-6`}>
        <h2 className="mb-5 font-display text-lg font-bold">{STEPS[step - 1]}</h2>
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Role *" error={errs.role_id}><SearchPicker ariaLabel="Role" grouped options={tax.roles} value={f.role_id} onChange={(v) => set("role_id", v)} placeholder="Search role (data, cloud, security…)" /></Field>
              <Field label="Level *" error={errs.level_id}><SearchPicker ariaLabel="Level" options={tax.levels} value={f.level_id} onChange={(v) => set("level_id", v)} placeholder="Search level" /></Field>
              <Field label="Custom Job Title (optional)" error={errs.custom_title} hint={<span className="text-xs text-muted-foreground">Display only</span>}><input className={inputCls} value={f.custom_title} onChange={(e) => set("custom_title", e.target.value)} placeholder={displayJobTitle("", tax.levels.find((l) => l.id === f.level_id)?.name ?? "Senior", tax.allRoles.find((r) => r.id === f.role_id)?.name ?? "Data Engineer") + " – AI Platform"} /></Field>
              <Field label="Shown To Candidates As"><input readOnly className={`${inputCls} bg-muted/50`} value={displayJobTitle(f.custom_title, tax.levels.find((l) => l.id === f.level_id)?.name, tax.allRoles.find((r) => r.id === f.role_id)?.name) || "Pick a role and level"} /></Field>
              <Field label="Company *" error={errs.company_id}><input className={`${inputCls} bg-muted/50`} value={companyName || "Your company"} readOnly /></Field>
              <Field label="Employment Type *" error={errs.employment_type}>
                <select className={inputCls} value={f.employment_type} onChange={(e) => set("employment_type", e.target.value)}>{EMPLOYMENT.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              </Field>
              <Field label="Work Arrangement *" error={errs.work_arrangement}>
                <select className={inputCls} value={f.work_arrangement} onChange={(e) => set("work_arrangement", e.target.value)}>{ARRANGEMENT.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              </Field>
              <Field label="Location *" error={errs.location}><input className={inputCls} value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="Austin, TX or Remote (US)" /></Field>
              <Field label="Minimum Years Experience *" error={errs.minimum_years_experience}><input type="number" min={0} max={50} className={inputCls} value={f.minimum_years_experience} onChange={(e) => set("minimum_years_experience", e.target.value)} /></Field>
            </div>
            <Field label="Job Description *" error={errs.job_description} hint={<span className={`text-xs ${f.job_description.length > DESCRIPTION_MAX ? "text-destructive" : "text-muted-foreground"}`}>{f.job_description.length}/{DESCRIPTION_MAX}</span>}>
              <span className="block" onClick={(e) => e.preventDefault()}><MarkdownEditor value={f.job_description} onChange={(v) => set("job_description", v)} placeholder="Describe the role, responsibilities, qualifications and benefits…" /></span>
            </Field>
          </div>
        )}
        {step === 2 && <><p className="mb-4 text-sm text-muted-foreground">Optional. Mark each language as Required, Preferred or Optional.</p><RequirementPicker options={tax.languages} kind="language" value={f.languages} onChange={(v) => set("languages", v)} placeholder="Search languages (Python, SQL, Java…)" /></>}
        {step === 3 && <><p className="mb-4 text-sm text-muted-foreground">Add at least one technical skill.</p><RequirementPicker options={tax.skills} kind="skill" value={f.skills} onChange={(v) => set("skills", v)} placeholder="Search skills (Machine Learning, System Design…)" />{errs.skills && <p className="mt-2 text-xs text-destructive">{errs.skills}</p>}
          <div className="mt-6 border-t border-border pt-5"><p className="mb-1 text-sm font-semibold">Soft Skills Requirements</p><p className="mb-4 text-sm text-muted-foreground">Optional. Shown to candidates for context only — not used in match scores.</p><RequirementPicker options={tax.softSkills} kind="soft_skill" value={f.softSkills} onChange={(v) => set("softSkills", v)} placeholder="Search soft skills (Communication, Leadership…)" /></div></>}
        {step === 4 && <><p className="mb-4 text-sm text-muted-foreground">Add at least one tool or technology.</p><RequirementPicker options={tax.technologies} kind="technology" value={f.technologies} onChange={(v) => set("technologies", v)} placeholder="Search tools (AWS, Snowflake, Kubernetes…)" />{errs.technologies && <p className="mt-2 text-xs text-destructive">{errs.technologies}</p>}</>}
        {step === 5 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Minimum Salary" error={errs.minimum_salary}><input type="text" inputMode="numeric" pattern="[0-9]*" className={inputCls} value={f.minimum_salary} onChange={(e) => set("minimum_salary", digitsOnly(e.target.value))} placeholder="120000" /></Field>
              <Field label="Maximum Salary" error={errs.maximum_salary}><input type="text" inputMode="numeric" pattern="[0-9]*" className={inputCls} value={f.maximum_salary} onChange={(e) => set("maximum_salary", digitsOnly(e.target.value))} placeholder="160000" /></Field>
              <Field label="Currency"><select className={inputCls} value={f.salary_currency} onChange={(e) => set("salary_currency", e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            </div>
            <Field label="Bonus Information"><input className={inputCls} value={f.bonus_info} onChange={(e) => set("bonus_info", e.target.value)} placeholder="Up to 15% annual bonus + equity" /></Field>
            <Field label="Benefits Summary"><textarea rows={4} className={inputCls} value={f.benefits_summary} onChange={(e) => set("benefits_summary", e.target.value)} placeholder="Health, dental, vision, 401(k) match, unlimited PTO…" /></Field>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:bg-card">
        <button type="button" disabled={step === 1} onClick={() => setStep(step - 1)} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-40"><ArrowLeft className="h-4 w-4" />Back</button>
        <div className="flex flex-wrap gap-2">
          {jobId && <button type="button" disabled={!!saving} onClick={() => submit("save")} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary disabled:opacity-60">{saving === "save" ? "Saving…" : "Save Changes"}</button>}
          {step < 5 ? (
            <button type="button" onClick={next} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Next<ArrowRight className="h-4 w-4" /></button>
          ) : (<>
            {!jobId && <button type="button" disabled={!!saving} onClick={() => submit("draft")} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary disabled:opacity-60">{saving === "draft" ? "Saving…" : "Save as Draft"}</button>}
            {status !== "active" && <button type="button" disabled={!!saving} onClick={() => submit("active")} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">{saving === "active" ? "Publishing…" : "Publish Job"}</button>}
          </>)}
        </div>
      </div>
    </div>
  );
}
