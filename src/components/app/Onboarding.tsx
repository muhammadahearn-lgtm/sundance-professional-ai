import { useQuery } from "@tanstack/react-query";
import { TagPicker } from "@/components/taxonomy/TextPicker";
import { addRoleEntry, newRoleName } from "@/lib/role-add";
import { LocationFields } from "@/components/location/LocationFields";
import { formatLocation } from "@/lib/location";
import { CURRENCIES, digitsOnly, parseSalaryInput } from "@/lib/salary";
import { useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Account } from "@/lib/account";
import { FormAlert, SuccessScreen } from "@/components/auth/AuthCard";
import { normalizeUrl, validateLinks } from "@/lib/profile-links";
import { addCompanyEntry } from "@/lib/company-add";
import { ResumeUploadCard } from "@/components/profile/ResumeUploadCard";
import { useResumeCatalogs, importResume } from "@/lib/resume-import";
import { isStorableResume, uploadResumeFile } from "@/lib/resume-storage";
import type { ParsedResume } from "@/lib/resume-parse";
import type { MatchedResume } from "@/lib/resume-taxonomy-matcher";

const TECH_SUGGESTIONS = ["Python", "SQL", "Java", "JavaScript", "TypeScript", "AWS", "Azure", "Snowflake", "Databricks", "Docker", "Kubernetes", "React", "Go", "Spark"];

function Progress({ step, total }: { step: number; total: number }) {
  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground">Step {step} of {total}</div>
      <div className="mt-2 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-gradient-primary transition-all" style={{ width: `${(step / total) * 100}%` }} /></div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function Choice<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: readonly (readonly [T, string])[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([v, l]) => (
        <button key={v} type="button" onClick={() => onChange(v)}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${value === v ? "border-primary bg-primary-soft text-primary" : "border-border hover:border-primary/40"}`}>{l}</button>
      ))}
    </div>
  );
}

function MultiSelect({ value, onChange, suggestions = TECH_SUGGESTIONS, placeholder }: { value: string[]; onChange: (v: string[]) => void; suggestions?: string[]; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = (t: string) => { const s = t.trim(); if (s && !value.includes(s)) onChange([...value, s]); setDraft(""); };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((t) => (
          <span key={t} className="flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
            {t}<button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((x) => x !== t))}><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      <Input value={draft} placeholder={placeholder ?? "Type and press Enter"} onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(draft); } }} />
      <div className="flex flex-wrap gap-1.5">
        {suggestions.filter((s) => !value.includes(s)).map((s) => (
          <button key={s} type="button" onClick={() => add(s)} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground">+ {s}</button>
        ))}
      </div>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-elevated sm:p-8">{children}</div>;
}

async function finish() {
  const { error } = await supabase.rpc("complete_onboarding");
  return error?.message ?? null;
}

export function CandidateOnboarding({ account }: { account: Account }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [f, setF] = useState({
    job_title: "", years_experience: "", location: "", location_country: "", location_state: "", location_city: "", headline: "", summary: "",
    programming_languages: [] as string[], technical_skills: [] as string[], tools: [] as string[],
    target_roles: [] as string[], salary_amount: "", salary_currency: "USD", availability: "open", work_arrangement: "remote",
    linkedin_url: "", github_url: "", portfolio_url: "",
  });
  const [proj, setProj] = useState({ title: "", project_url: "", description: "" });
  const [method, setMethod] = useState<"choose" | "form">("choose");
  const [resume, setResume] = useState<{ p: ParsedResume; m: MatchedResume; file: File } | null>(null);
  const catalogs = useResumeCatalogs();
  const roleNames = useQuery({ queryKey: ["role-names"], staleTime: 3600_000, queryFn: async () => ((await supabase.from("roles").select("role_name").eq("is_active", true).order("sort_order")).data ?? []).map((r) => r.role_name) });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  function applyResume(p: ParsedResume, m: MatchedResume, file: File) {
    const names = (xs: { name: string }[]) => [...new Set(xs.map((x) => x.name))];
    const loc = { country: m.country, state: p.location_state, city: p.location_city };
    setF((o) => ({
      ...o,
      job_title: m.currentRole?.name ?? (p.job_title || o.job_title),
      years_experience: p.years_experience != null ? String(p.years_experience) : o.years_experience,
      location_country: loc.country || o.location_country, location_state: loc.state || o.location_state, location_city: loc.city || o.location_city,
      location: loc.country ? formatLocation(loc) : o.location,
      headline: (p.headline || o.headline).slice(0, 140), summary: (p.summary || o.summary).slice(0, 2000),
      programming_languages: names(m.languages), technical_skills: names(m.skills), tools: names(m.technologies),
      target_roles: m.targetRoles.length ? names(m.targetRoles) : m.currentRole ? [m.currentRole.name] : o.target_roles,
      linkedin_url: p.linkedin_url || o.linkedin_url, github_url: p.github_url || o.github_url, portfolio_url: p.portfolio_url || o.portfolio_url,
    }));
    const pr = p.projects[0];
    if (pr) setProj({ title: pr.title.slice(0, 120), project_url: pr.project_url, description: pr.description.slice(0, 1000) });
    setResume({ p, m, file });
    setStep(1);
    setMethod("form");
  }

  function next() {
    setError("");
    if (step === 1 && (!f.job_title.trim() || !f.location_country || !f.location_state.trim() || !f.location_city.trim() || !f.headline.trim() || f.years_experience === "")) return setError("Please fill in your role, experience, location, and headline.");
    if (step === 1) { const r = validateLinks(f); if (!r.ok) return setError(r.error); }
    if (step === 2 && f.programming_languages.length + f.technical_skills.length + f.tools.length === 0) return setError("Add at least one skill or technology.");
    setStep(step + 1);
  }

  async function submit() {
    setError("");
    if (f.target_roles.length === 0) return setError("Add at least one target role.");
    const links = validateLinks(f);
    if (!links.ok) return setError(links.error);
    const amt = parseSalaryInput(f.salary_amount);
    if (!amt.ok) return setError(amt.error);
    const projUrl = normalizeUrl(proj.project_url);
    if (projUrl === null) return setError("Enter a valid project link.");
    if (!proj.title.trim() && (proj.project_url.trim() || proj.description.trim())) return setError("Give your project a title.");
    setSaving(true);
    const resumePath = resume && isStorableResume(resume.file) ? await uploadResumeFile(account.userId, resume.file) : null;
    const resumeCols = resumePath && resume ? { resume_path: resumePath, resume_file_name: resume.file.name, resume_uploaded_at: new Date().toISOString() } : {};
    const { error: e1 } = await supabase.from("candidate_profiles").upsert({
      user_id: account.userId, ...f, ...resumeCols, salary_amount: amt.value, ...links.value, years_experience: Math.max(0, Math.min(60, Number(f.years_experience) || 0)),
    });
    let e2 = e1 ? e1.message : null;
    if (!e2 && proj.title.trim()) {
      const { error } = await supabase.from("candidate_projects").insert({ candidate_id: account.userId, title: proj.title.trim().slice(0, 120), description: proj.description.trim().slice(0, 1000), project_url: projUrl });
      if (error) e2 = error.message;
    }
    if (!e2 && resume) { try { await importResume(account.userId, resume.p, resume.m); } catch { /* extras are optional; candidate can add them on the profile */ } }
    if (!e2) e2 = await finish();
    setSaving(false);
    if (e2) return setError("We couldn't save your profile. Please try again.");
    setDone(true);
  }

  if (!done && method === "choose") return (
    <Shell>
      <h1 className="text-2xl font-extrabold">Let's build your profile</h1>
      <p className="mt-2 text-sm text-muted-foreground">Upload your resume to fill most of it in seconds, or enter your details yourself.</p>
      <ResumeUploadCard className="mt-6" catalogs={catalogs.data ?? null} onParsed={applyResume} onSkip={() => setMethod("form")} />
      <div className="mt-4 text-center"><Button variant="ghost" className="rounded-full" onClick={() => setMethod("form")}>Enter my details manually</Button></div>
    </Shell>
  );

  if (done) return <Shell><SuccessScreen title="You're all set" actions={<Button className="rounded-full" onClick={() => navigate({ to: "/candidate/dashboard" })}>Go to dashboard</Button>}>Your talent profile setup is complete.</SuccessScreen></Shell>;

  return (
    <Shell>
      <Progress step={step} total={3} />
      <h1 className="mt-6 text-2xl font-extrabold">{["Professional Information", "Technical Qualifications", "Career Preferences"][step - 1]}</h1>
      <div className="mt-6 space-y-5">
        {error && <FormAlert>{error}</FormAlert>}
        {resume && <div className="rounded-xl border border-primary/30 bg-primary-soft px-4 py-3 text-sm text-primary">Pre-filled from your resume — please review and adjust any field. Your jobs, education and certifications are added when you finish, and your resume is attached for recruiters to download.{resume.m.unmatched.length > 0 && <> Not on our lists yet (add them later on your profile): {resume.m.unmatched.map((u) => u.name).join(", ")}.</>}</div>}
        {step === 1 && (<>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Current Role"><Input value={f.job_title} onChange={(e) => set("job_title", e.target.value)} placeholder="Senior Data Engineer" maxLength={100} /></Field>
            <Field label="Years of Experience"><Input type="number" min={0} max={60} value={f.years_experience} onChange={(e) => set("years_experience", e.target.value)} /></Field>
          </div>
          <LocationFields required value={{ country: f.location_country, state: f.location_state, city: f.location_city }} onChange={(v) => setF((p) => ({ ...p, location_country: v.country, location_state: v.state, location_city: v.city, location: formatLocation(v) }))} />
          <Field label="Professional Headline"><Input value={f.headline} onChange={(e) => set("headline", e.target.value)} placeholder="Data engineer building reliable pipelines at scale" maxLength={140} /></Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="LinkedIn (optional)"><Input value={f.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} placeholder="linkedin.com/in/you" maxLength={300} /></Field>
            <Field label="GitHub (optional)"><Input value={f.github_url} onChange={(e) => set("github_url", e.target.value)} placeholder="github.com/you" maxLength={300} /></Field>
            <Field label="Portfolio (optional)"><Input value={f.portfolio_url} onChange={(e) => set("portfolio_url", e.target.value)} placeholder="yoursite.com" maxLength={300} /></Field>
          </div>
          <Field label="Professional Summary"><Textarea rows={4} value={f.summary} onChange={(e) => set("summary", e.target.value)} maxLength={2000} /></Field>
        </>)}
        {step === 2 && (<>
          <Field label="Programming Languages"><MultiSelect value={f.programming_languages} onChange={(v) => set("programming_languages", v)} suggestions={["Python", "SQL", "Java", "JavaScript", "TypeScript", "Go", "Scala", "C#"]} /></Field>
          <Field label="Technical Skills"><MultiSelect value={f.technical_skills} onChange={(v) => set("technical_skills", v)} suggestions={["Machine Learning", "Data Modeling", "ETL", "System Design", "APIs", "React"]} /></Field>
          <Field label="Tools & Technologies"><MultiSelect value={f.tools} onChange={(v) => set("tools", v)} suggestions={["AWS", "Azure", "Snowflake", "Databricks", "Docker", "Kubernetes", "Airflow"]} /></Field>
        </>)}
        {step === 3 && (<>
          <Field label="Target Roles"><TagPicker ariaLabel="Target roles" options={roleNames.data ?? []} value={f.target_roles} onChange={(v) => set("target_roles", v)} placeholder="Search 120+ roles…" nameFor={newRoleName} onAdd={async (n) => (await addRoleEntry(n)).name} addHint="Seniority goes in your level, so “Senior” is left out." /></Field>
          <Field label="Desired Minimum Salary"><div className="flex gap-2"><Input type="text" inputMode="numeric" pattern="[0-9]*" value={f.salary_amount} onChange={(e) => set("salary_amount", digitsOnly(e.target.value))} placeholder="60000" /><select aria-label="Currency" className="h-10 w-28 rounded-md border border-input bg-background px-3 text-sm" value={f.salary_currency} onChange={(e) => set("salary_currency", e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></div></Field>
          <Field label="Availability"><Choice value={f.availability} onChange={(v) => set("availability", v)} options={[["active", "Actively Looking"], ["open", "Open To Opportunities"], ["not_looking", "Not Looking"]] as const} /></Field>
          <Field label="Preferred Work Arrangement"><Choice value={f.work_arrangement} onChange={(v) => set("work_arrangement", v)} options={[["remote", "Remote"], ["hybrid", "Hybrid"], ["onsite", "On-Site"]] as const} /></Field>
          <div className="space-y-3 rounded-2xl border border-border p-4">
            <p className="text-sm font-semibold">Featured Project <span className="font-normal text-muted-foreground">(optional — add more later on your profile)</span></p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Project Title"><Input value={proj.title} onChange={(e) => setProj({ ...proj, title: e.target.value })} maxLength={120} /></Field>
              <Field label="Project Link"><Input value={proj.project_url} onChange={(e) => setProj({ ...proj, project_url: e.target.value })} placeholder="github.com/you/project" maxLength={300} /></Field>
            </div>
            <Field label="Short Description"><Textarea rows={2} value={proj.description} onChange={(e) => setProj({ ...proj, description: e.target.value })} maxLength={1000} /></Field>
          </div>
        </>)}
      </div>
      <div className="mt-8 flex gap-3">
        {step > 1 && <Button variant="outline" className="rounded-full" onClick={() => setStep(step - 1)}>Back</Button>}
        {step < 3 ? <Button className="flex-1 rounded-full" onClick={next}>Continue</Button> : <Button className="flex-1 rounded-full" onClick={submit} disabled={saving}>{saving ? "Saving…" : "Complete setup"}</Button>}
      </div>
    </Shell>
  );
}

export function RecruiterOnboarding({ account }: { account: Account }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [f, setF] = useState({
    title: "", specialization: "", years_experience: "", location: "", location_country: "", location_state: "", location_city: "",
    company_name: "", company_website: "", industry: "", company_description: "", organization_type: "corporate",
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  function next() {
    setError("");
    if (!f.title.trim() || !f.specialization.trim() || !f.location_country || !f.location_state.trim() || !f.location_city.trim() || f.years_experience === "") return setError("Please fill in all recruiter fields.");
    setStep(2);
  }

  async function submit() {
    setError("");
    if (!f.company_name.trim() || !f.industry.trim()) return setError("Company name and industry are required.");
    if (f.company_website && !/^https?:\/\/\S+\.\S+/.test(f.company_website.trim())) return setError("Enter a valid website starting with http:// or https://");
    setSaving(true);
    // Link to an existing company with the same normalized name (or create it) so teammates join one team.
    let company: { id: string; name: string } | null = null;
    try { company = await addCompanyEntry(f.company_name); } catch { company = null; }
    if (!company) { setSaving(false); return setError("Enter a valid company name (2–80 characters)."); }
    const { error: e1 } = await supabase.from("recruiter_profiles").upsert({
      user_id: account.userId, ...f, company_name: company.name, company_id: company.id,
      years_experience: Math.max(0, Math.min(60, Number(f.years_experience) || 0)),
    });
    const e2 = e1 ? e1.message : await finish();
    setSaving(false);
    if (e2) return setError("We couldn't save your profile. Please try again.");
    setDone(true);
  }

  if (done) return <Shell><SuccessScreen title="You're all set" actions={<Button className="rounded-full" onClick={() => navigate({ to: "/recruiter/dashboard" })}>Go to dashboard</Button>}>Your recruiter profile is ready.</SuccessScreen></Shell>;

  return (
    <Shell>
      <Progress step={step} total={2} />
      <h1 className="mt-6 text-2xl font-extrabold">{step === 1 ? "Recruiter Information" : "Company Information"}</h1>
      <div className="mt-6 space-y-5">
        {error && <FormAlert>{error}</FormAlert>}
        {step === 1 ? (<>
          <Field label="Recruiter Title"><Input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Senior Technical Recruiter" maxLength={100} /></Field>
          <Field label="Recruiting Specialization"><Input value={f.specialization} onChange={(e) => set("specialization", e.target.value)} placeholder="Data & AI engineering" maxLength={100} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Years of Experience"><Input type="number" min={0} max={60} value={f.years_experience} onChange={(e) => set("years_experience", e.target.value)} /></Field>
          </div>
          <LocationFields required value={{ country: f.location_country, state: f.location_state, city: f.location_city }} onChange={(v) => setF((p) => ({ ...p, location_country: v.country, location_state: v.state, location_city: v.city, location: formatLocation(v) }))} />
        </>) : (<>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your Employer or Agency"><Input value={f.company_name} onChange={(e) => set("company_name", e.target.value)} maxLength={80} placeholder="e.g. Apex Staffing" /><p className="text-xs text-muted-foreground">The company you work for. If it's already on Sundance, you'll join its team automatically. Client companies are picked per job.</p></Field>
            <Field label="Company Website"><Input value={f.company_website} onChange={(e) => set("company_website", e.target.value)} placeholder="https://" maxLength={200} /></Field>
          </div>
          <Field label="Industry"><Input value={f.industry} onChange={(e) => set("industry", e.target.value)} placeholder="Fintech" maxLength={100} /></Field>
          <Field label="Company Description"><Textarea rows={4} value={f.company_description} onChange={(e) => set("company_description", e.target.value)} maxLength={2000} /></Field>
          <Field label="Organization Type"><Choice value={f.organization_type} onChange={(v) => set("organization_type", v)} options={[["corporate", "Corporate Employer"], ["staffing", "Staffing Agency"], ["executive_search", "Executive Search Firm"], ["consulting", "Consulting Firm"], ["independent", "Independent Recruiter"]] as const} /></Field>
        </>)}
      </div>
      <div className="mt-8 flex gap-3">
        {step > 1 && <Button variant="outline" className="rounded-full" onClick={() => setStep(1)}>Back</Button>}
        {step < 2 ? <Button className="flex-1 rounded-full" onClick={next}>Continue</Button> : <Button className="flex-1 rounded-full" onClick={submit} disabled={saving}>{saving ? "Saving…" : "Complete setup"}</Button>}
      </div>
    </Shell>
  );
}
