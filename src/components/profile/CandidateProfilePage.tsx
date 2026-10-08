import { ResumeAutofillPanel } from "./ResumeAutofillPanel";
import { isStorableResume } from "@/lib/resume-storage";
import { LocationFields } from "@/components/location/LocationFields";
import { EducationLines } from "@/components/profile/EducationLines";
import { formatLocation, type LocationParts } from "@/lib/location";
import { SearchPicker } from "@/components/taxonomy/SearchPicker";
import { loadTaxonomy } from "@/lib/jobs-data";
import { addRoleEntry } from "@/lib/role-add";
import { CURRENCIES, digitsOnly, formatSalaryAmount, parseSalaryInput } from "@/lib/salary";
import { Link } from "@tanstack/react-router";
import { CandidateMatchWidget } from "@/components/match/Match";
import { useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Award, Briefcase, Code2, Cpu, Download, Eye, EyeOff, FileText, GraduationCap, MapPin, Pencil, Plus, ShieldCheck, Target, Trash2, Upload, UserRound, Wrench, ArrowLeft, Lightbulb, HeartHandshake, Globe, FolderGit2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Account } from "@/lib/account";
import { computeCompletion, missingRequired, validateProfessional, validateResumeFile, SUMMARY_MAX } from "@/lib/profile-completion";
import { ProfilePhoto } from "@/components/app/ProfilePhoto";
import { CertificationManager, EducationManager, ExperienceManager, LookupManager, SoftSkillManager, type LookupRow } from "./managers";
import { BannerLinks, LinkBadges, ProjectList, ProjectsManager, type Project } from "./links-projects";
import { ARRANGEMENTS, AVAILABILITY, availTone, Chips, Field, SaveBar, Section, TagInput, card, cap, friendlyError, inputCls, label, type Proficiency } from "./parts";
import { SpokenLanguageAddButton, SpokenLanguagesManager } from "./SpokenLanguagesManager";
import { StandardResumeWorkspace, type StandardResumeData } from "./StandardResumeWorkspace";
import { ProfileTabBar, useProfileTab } from "./ProfileTabs";

type Lk = { lookup_id: string; proficiency_level: Proficiency; years_experience: number };

async function loadAll(uid: string) {
  const [p, exp, edu, cert, langs, skills, techs, rl, ll, sl, tl, cs, ssl, pj, spoken, standard] = await Promise.all([
    supabase.from("candidate_profiles").select("*").eq("user_id", uid).maybeSingle(),
    supabase.from("work_experience").select("*").eq("candidate_id", uid),
    supabase.from("education").select("*").eq("candidate_id", uid),
    supabase.from("certifications").select("*").eq("candidate_id", uid).order("issue_date", { ascending: false }),
    supabase.from("candidate_languages").select("lookup_id, proficiency_level, years_experience").eq("candidate_id", uid),
    supabase.from("candidate_skills").select("lookup_id, proficiency_level, years_experience").eq("candidate_id", uid),
    supabase.from("candidate_technologies").select("lookup_id, proficiency_level, years_experience").eq("candidate_id", uid),
    supabase.from("roles").select("role_id, role_name").eq("is_active", true).order("role_name"),
    supabase.from("programming_languages").select("language_id, language_name").order("language_name"),
    supabase.from("technical_skills").select("skill_id, skill_name").order("skill_name"),
    supabase.from("technologies").select("technology_id, technology_name, technology_category").order("technology_name"),
    supabase.from("candidate_soft_skills").select("lookup_id").eq("candidate_id", uid),
    supabase.from("soft_skills").select("soft_skill_id, soft_skill_name").order("soft_skill_name"),
    supabase.from("candidate_projects").select("project_id, title, description, project_url, technologies").eq("candidate_id", uid).order("created_at"),
    supabase.from("candidate_spoken_languages").select("spoken_language_id, language_name, proficiency").eq("candidate_id", uid).order("language_name"),
    supabase.from("standard_resume_versions").select("standard_resume_id, version_number, snapshot, pdf_path, include_photo, section_order, published_at").eq("candidate_id", uid).order("version_number", { ascending: false }),
  ]);
  const err = [p, exp, edu, cert, langs, skills, techs, rl, ll, sl, tl, cs, ssl, pj, spoken, standard].find((r) => r.error)?.error;
  if (err) throw err;
  const langOpts = (ll.data ?? []).map((x) => ({ id: x.language_id, name: x.language_name }));
  const skillOpts = (sl.data ?? []).map((x) => ({ id: x.skill_id, name: x.skill_name }));
  const techOpts = (tl.data ?? []).map((x) => ({ id: x.technology_id, name: x.technology_name, group: x.technology_category }));
  const join = (rows: Lk[] | null, opts: { id: string; name: string }[]): LookupRow[] =>
    (rows ?? []).map((r) => ({ ...r, name: opts.find((o) => o.id === r.lookup_id)?.name ?? "" })).sort((a, b) => a.name.localeCompare(b.name));
  return {
    profile: p.data, experience: exp.data ?? [], education: edu.data ?? [], certifications: cert.data ?? [],
    languages: join(langs.data as Lk[] | null, langOpts), skills: join(skills.data as Lk[] | null, skillOpts), technologies: join(techs.data as Lk[] | null, techOpts),
    roleNames: (rl.data ?? []).map((r) => r.role_name), roleById: Object.fromEntries((rl.data ?? []).map((r) => [r.role_id, r.role_name])) as Record<string, string>, langOpts, skillOpts, techOpts,
    softSkills: (cs.data ?? []).map((x) => x.lookup_id), softOpts: (ssl.data ?? []).map((x) => ({ id: x.soft_skill_id, name: x.soft_skill_name })),
    softSkillRows: (cs.data ?? []).map((x) => ({ name: (ssl.data ?? []).find((o) => o.soft_skill_id === x.lookup_id)?.soft_skill_name ?? "" })).filter((x) => x.name),
    projects: (pj.data ?? []) as Project[],
    spokenLanguages: spoken.data ?? [], standardResumes: standard.data ?? [],
  };
}
type Data = Awaited<ReturnType<typeof loadAll>>;
type Profile = NonNullable<Data["profile"]>;

export function CandidateProfilePage({ account }: { account: Account }) {
  const uid = account.userId;
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["candidate-full", uid], queryFn: () => loadAll(uid) });
  const [preview, setPreview] = useState(false);
  const [autofill, setAutofill] = useState(false);
  const [autofillFile, setAutofillFile] = useState<File | null>(null);
  const [editPro, setEditPro] = useState(false);
  const [editPrefs, setEditPrefs] = useState(false);
  const [adding, setAdding] = useState<"exp" | "edu" | "cert" | "lang" | "spoken" | "skill" | "soft" | "tech" | "proj" | null>(null);
  const [tab, setTab] = useProfileTab(["about", "experience", "skills", "resume"] as const, "about");

  if (isLoading) return <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className={`${card} h-40 animate-pulse`} />)}</div>;
  if (error || !data) return (
    <div className={`${card} p-8 text-center`}>
      <p className="font-semibold">{friendlyError(error, "We couldn't load your profile.")}</p>
      <button onClick={() => refetch()} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Try again</button>
    </div>
  );
  if (!data.profile) return <div className={`${card} p-8 text-center`}>Your profile hasn't been set up yet. Please finish onboarding.</div>;

  const p = data.profile;
  const completion = computeCompletion({
    jobTitle: p.job_title, headline: p.headline, location: p.location, yearsExperience: p.years_experience, summary: p.summary,
    experienceCount: data.experience.length, educationCount: data.education.length, certificationCount: data.certifications.length,
    skillCount: data.skills.length, languageCount: data.languages.length, technologyCount: data.technologies.length,
    targetRoleCount: p.target_roles.length, salaryExpectation: formatSalaryAmount(p.salary_amount, p.salary_currency), hasResume: !!p.resume_path || data.standardResumes.length > 0,
  });
  const missing = missingRequired({ jobTitle: p.job_title, headline: p.headline, location: p.location, skillCount: data.skills.length, technologyCount: data.technologies.length, targetRoleCount: p.target_roles.length });

  if (preview) return <RecruiterPreview account={account} data={data} onBack={() => setPreview(false)} />;

  const addBtn = (text: string, onClick: () => void) => (
    <button onClick={onClick} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold hover:border-primary hover:text-primary"><Plus className="h-4 w-4" aria-hidden /><span className="sr-only sm:not-sr-only">{text}</span></button>
  );
  const editBtn = (onClick: () => void) => (
    <button onClick={onClick} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold hover:border-primary hover:text-primary"><Pencil className="h-4 w-4" aria-hidden /><span className="sr-only sm:not-sr-only">Edit</span></button>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-6">
        <Header account={account} p={p} percent={completion.percent}
          onPreview={() => setPreview(true)} />
        <ResumeAutofillPanel uid={uid} profile={p} open={autofill} initialFile={autofillFile} onOpenChange={(v) => { setAutofill(v); if (!v) setAutofillFile(null); }} />

        <ProfileTabBar value={tab} onChange={setTab} tabs={[
          { key: "about", label: "About Me", icon: <UserRound className="h-4 w-4" />, incomplete: !p.job_title || !p.headline || !p.location || !p.target_roles.length },
          { key: "experience", label: "Experience & Education", icon: <Briefcase className="h-4 w-4" />, incomplete: !data.experience.length || !data.education.length },
          { key: "skills", label: "Skills & Languages", icon: <Wrench className="h-4 w-4" />, incomplete: !data.skills.length || !data.technologies.length },
          { key: "resume", label: "Resume", icon: <FileText className="h-4 w-4" />, incomplete: !p.resume_path && !data.standardResumes.length },
        ]} />

        {tab === "about" && <>
        <Section id="professional" title="Professional Information" icon={<UserRound className="h-4 w-4" />} action={!editPro && editBtn(() => setEditPro(true))}>
          {editPro ? <ProfessionalForm p={p} uid={uid} onDone={() => setEditPro(false)} /> : (
            <div className="space-y-5">
              <dl className="grid gap-5 sm:grid-cols-3">
                <RoleLevelItems p={p} /><Item k="Current Job Title" v={p.job_title} /><Item k="Headline" v={p.headline} /><Item k="Current Employer" v={p.current_employer} />
                <Item k="Location" v={p.location} /><Item k="Years Of Experience" v={`${p.years_experience}`} /><Item k="Industry Experience" v={p.industry_experience.join(", ")} />
              </dl>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Professional Summary</dt><p className="mt-1 whitespace-pre-line text-sm">{p.summary || "—"}</p></div>
            </div>
          )}
        </Section>
        <Section id="preferences" title="Career Preferences" icon={<Target className="h-4 w-4" />} action={!editPrefs && editBtn(() => setEditPrefs(true))}>
          {editPrefs ? <PreferencesForm p={p} uid={uid} roleNames={data.roleNames} onDone={() => setEditPrefs(false)} /> : <PrefsView p={p} />}
        </Section>
        </>}

        {tab === "experience" && <>
        <Section id="experience" title="Work Experience" icon={<Briefcase className="h-4 w-4" />} action={adding !== "exp" && addBtn("Add Experience", () => setAdding("exp"))}>
          <ExperienceManager uid={uid} items={data.experience} adding={adding === "exp"} setAdding={(v) => setAdding(v ? "exp" : null)} />
        </Section>
        <Section id="projects" title="Projects" icon={<FolderGit2 className="h-4 w-4" />} action={adding !== "proj" && addBtn("Add Project", () => setAdding("proj"))}>
          <ProjectsManager uid={uid} items={data.projects ?? []} adding={adding === "proj"} setAdding={(v) => setAdding(v ? "proj" : null)} />
        </Section>
        <Section id="education" title="Education" icon={<GraduationCap className="h-4 w-4" />} action={adding !== "edu" && addBtn("Add Education", () => setAdding("edu"))}>
          <EducationManager uid={uid} items={data.education} adding={adding === "edu"} setAdding={(v) => setAdding(v ? "edu" : null)} />
        </Section>
        <Section id="certifications" title="Certifications" icon={<Award className="h-4 w-4" />} action={adding !== "cert" && addBtn("Add Certification", () => setAdding("cert"))}>
          <CertificationManager uid={uid} items={data.certifications} adding={adding === "cert"} setAdding={(v) => setAdding(v ? "cert" : null)} />
        </Section>
        </>}

        {tab === "skills" && <>
        <Section id="languages" title="Programming Languages" icon={<Code2 className="h-4 w-4" />} action={adding !== "lang" && addBtn("Add Language", () => setAdding("lang"))}>
          <LookupManager roleName={data.roleById?.[data.profile?.role_id ?? ""] ?? data.roleById?.[data.profile?.target_role_id ?? ""]} uid={uid} table="candidate_languages" options={data.langOpts} rows={data.languages} noun="language" successMsg="Languages updated" adding={adding === "lang"} setAdding={(v) => setAdding(v ? "lang" : null)} />
        </Section>
        <Section id="technologies" title="Technologies & Tools" icon={<Cpu className="h-4 w-4" />} action={adding !== "tech" && addBtn("Add Technology", () => setAdding("tech"))}>
          <LookupManager roleName={data.roleById?.[data.profile?.role_id ?? ""] ?? data.roleById?.[data.profile?.target_role_id ?? ""]} uid={uid} table="candidate_technologies" options={data.techOpts} otherOptions={data.skillOpts} rows={data.technologies} noun="technology" required successMsg="Technologies updated" adding={adding === "tech"} setAdding={(v) => setAdding(v ? "tech" : null)} />
        </Section>
        <Section id="skills" title="Technical Skills" icon={<Wrench className="h-4 w-4" />} action={adding !== "skill" && addBtn("Add Skill", () => setAdding("skill"))}>
          <LookupManager roleName={data.roleById?.[data.profile?.role_id ?? ""] ?? data.roleById?.[data.profile?.target_role_id ?? ""]} uid={uid} table="candidate_skills" options={data.skillOpts} otherOptions={data.techOpts} rows={data.skills} noun="skill" required successMsg="Skills updated" adding={adding === "skill"} setAdding={(v) => setAdding(v ? "skill" : null)} />
        </Section>
        <Section id="soft-skills" title="Soft Skills" icon={<HeartHandshake className="h-4 w-4" />} action={adding !== "soft" && addBtn("Add Soft Skill", () => setAdding("soft"))}>
          <SoftSkillManager roleName={data.roleById?.[data.profile?.role_id ?? ""] ?? data.roleById?.[data.profile?.target_role_id ?? ""]} uid={uid} options={data.softOpts ?? []} selected={data.softSkills ?? []} adding={adding === "soft"} setAdding={(v) => setAdding(v ? "soft" : null)} />
        </Section>
        <Section id="spoken-languages" title="Spoken Languages" icon={<Globe className="h-4 w-4" />} action={adding !== "spoken" && <SpokenLanguageAddButton onClick={() => setAdding("spoken")} />}>
          <SpokenLanguagesManager uid={uid} items={data.spokenLanguages} adding={adding === "spoken"} setAdding={(v) => setAdding(v ? "spoken" : null)} />
          <p className="mt-3 text-xs text-muted-foreground">Spoken languages appear on your profile and Sundance resume. They never affect match or ranking scores.</p>
        </Section>
        </>}

        {tab === "resume" && <>
        <Section id="resume" title="Your Resume / CV" icon={<FileText className="h-4 w-4" />}>
          <ResumeManager uid={uid} p={p} onAutofill={(f) => { setAutofillFile(f); setAutofill(true); }} />
          <p className="mt-3 text-xs text-muted-foreground">Recruiters can download this file. Each time you upload, Sundance AI compares it with your profile and suggests anything missing — you choose what to add.</p>
          <div className="mt-5 border-t border-border pt-5"><StandardResumeWorkspace account={account} data={data as StandardResumeData} /></div>
        </Section>
        </>}
      </div>

      <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
        <div className={`${card} p-6`}>
          <p className="text-sm font-semibold text-muted-foreground">Profile Completion</p>
          <p className="mt-1 font-display text-4xl font-extrabold text-primary">{completion.percent}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-primary transition-all" style={{ width: `${completion.percent}%` }} /></div>
          {completion.recommendations.length > 0 ? (
            <ul className="mt-5 space-y-2.5">{completion.recommendations.map((r) => (
              <li key={r} className="flex gap-2 text-sm"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{r}</li>
            ))}</ul>
          ) : <p className="mt-4 text-sm text-success">Your profile is complete. Great work!</p>}
        </div>
        <Link to="/candidate/career" className="block rounded-2xl border border-primary/30 bg-primary-soft/40 p-4 text-sm font-semibold text-primary hover:bg-primary-soft">Career Intelligence → readiness, gaps, salary & roadmap</Link>
        <CandidateMatchWidget compact uid={uid} key={`${data.skills.length}-${data.languages.length}-${data.technologies.length}-${p.updated_at}`} />
        {missing.length > 0 && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
            <p className="text-sm font-semibold text-destructive">Required to appear in searches</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{missing.map((m) => <li key={m}>{m}</li>)}</ul>
          </div>
        )}
      </aside>
    </div>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{k}</dt><dd className="mt-1 text-sm">{v || "—"}</dd></div>;
}

function Header({ account, p, percent, onPreview }: { account: Account; p: Profile; percent: number; onPreview: () => void }) {
  const initials = `${account.firstName[0] ?? ""}${account.lastName[0] ?? ""}`.toUpperCase() || "?";
  const [photo, setPhoto] = useState(account.avatarPath);
  const qc = useQueryClient();
  return (
    <div className={`${card} overflow-hidden`}>
      <div className="h-24 bg-gradient-hero" />
      <div className="px-5 pb-6 sm:px-6">
        <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
          <ProfilePhoto uid={account.userId} path={photo} initials={initials} editable onChange={(p2) => { setPhoto(p2); void qc.invalidateQueries(); }} />
          <div className="flex flex-wrap gap-2">
            <button onClick={onPreview} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-sm font-semibold hover:bg-muted"><Eye className="h-4 w-4" />Preview Profile</button>
          </div>
        </div>
        <h1 className="mt-4 font-display text-2xl font-extrabold">{account.firstName} {account.lastName}</h1>
        <p className="font-medium">{p.job_title || "Add your current role"}</p>
        {p.headline && <p className="text-sm text-muted-foreground">{p.headline}</p>}
        <BannerLinks uid={account.userId} p={p} />
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          {p.location && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{p.location}</span>}
          <span>{p.years_experience} Years Experience</span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${availTone(p.availability)}`}>{label(AVAILABILITY, p.availability)}</span>
          <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">Profile Completion {percent}%</span>
        </div>
      </div>
    </div>
  );
}

function useSaveProfile(uid: string) {
  const qc = useQueryClient();
  return async (patch: Partial<Profile>, ok: string) => {
    const { error } = await supabase.from("candidate_profiles").update(patch).eq("user_id", uid);
    if (error) { toast.error(friendlyError(error, "Profile save failed. Please try again.")); return false; }
    toast.success(ok);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["candidate-full", uid] }),
      qc.invalidateQueries({ queryKey: ["privacy-summary", uid] }),
    ]);
    return true;
  };
}

function ProfessionalForm({ p, uid, onDone }: { p: Profile; uid: string; onDone: () => void }) {
  const save = useSaveProfile(uid);
  const tax = useQuery({ queryKey: ["role-level-tax"], queryFn: loadTaxonomy, staleTime: 300_000 });
  const [rl, setRl] = useState({ role_id: p.role_id ?? "", current_level_id: p.current_level_id ?? "", target_role_id: p.target_role_id ?? "", target_level_id: p.target_level_id ?? "" });
  const [f, setF] = useState({ jobTitle: p.job_title, headline: p.headline, employer: p.current_employer, location: p.location, yearsExperience: String(p.years_experience), industries: p.industry_experience, summary: p.summary });
  const [loc, setLoc] = useState<LocationParts>({ country: p.location_country, state: p.location_state, city: p.location_city });
  const [err, setErr] = useState<Partial<Record<keyof typeof f, string>>>({});
  const [saving, setSaving] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    const er = validateProfessional(f);
    if (!loc.country || !loc.state.trim() || !loc.city.trim()) er.location = "Country, state / province and city are required.";
    setErr(er);
    if (Object.keys(er).length) { toast.error("Missing required fields. Please fix the highlighted fields."); return; }
    setSaving(true);
    const ok = await save({ role_id: rl.role_id || null, current_level_id: rl.current_level_id || null, target_role_id: rl.target_role_id || null, target_level_id: rl.target_level_id || null, job_title: f.jobTitle.trim(), headline: f.headline.trim(), current_employer: f.employer.trim(), location: formatLocation(loc), location_country: loc.country, location_state: loc.state, location_city: loc.city, years_experience: Number(f.yearsExperience), industry_experience: f.industries, summary: f.summary.trim() }, "Profile updated");
    setSaving(false);
    if (ok) onDone();
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Current Role"><SearchPicker ariaLabel="Current role" grouped options={tax.data?.roles ?? []} value={rl.role_id} onChange={(v) => setRl({ ...rl, role_id: v })} placeholder="Search role" onAdd={addRoleEntry} addHint="Seniority goes in Level." /></Field>
        <Field label="Current Level"><SearchPicker ariaLabel="Current level" options={tax.data?.levels ?? []} value={rl.current_level_id} onChange={(v) => setRl({ ...rl, current_level_id: v })} placeholder="Search level" /></Field>
        <Field label="Target Role"><SearchPicker ariaLabel="Target role" grouped options={tax.data?.roles ?? []} value={rl.target_role_id} onChange={(v) => setRl({ ...rl, target_role_id: v })} placeholder="Search role" onAdd={addRoleEntry} addHint="Seniority goes in Level." /></Field>
        <Field label="Target Level"><SearchPicker ariaLabel="Target level" options={tax.data?.levels ?? []} value={rl.target_level_id} onChange={(v) => setRl({ ...rl, target_level_id: v })} placeholder="Search level" /></Field>
        <Field label="Current Job Title *" error={err.jobTitle}><input className={inputCls} maxLength={120} value={f.jobTitle} onChange={(e) => setF({ ...f, jobTitle: e.target.value })} /></Field>
        <Field label="Professional Headline *" error={err.headline}><input className={inputCls} maxLength={160} value={f.headline} onChange={(e) => setF({ ...f, headline: e.target.value })} /></Field>
        <Field label="Current Employer"><input className={inputCls} maxLength={120} value={f.employer} onChange={(e) => setF({ ...f, employer: e.target.value })} /></Field>
        <LocationFields required error={err.location} value={loc} onChange={(v) => { setLoc(v); setF((x) => ({ ...x, location: formatLocation(v) })); }} />
        <Field label="Years Of Experience *" error={err.yearsExperience}><input inputMode="numeric" className={inputCls} value={f.yearsExperience} onChange={(e) => setF({ ...f, yearsExperience: e.target.value })} /></Field>
        <Field label="Industry Experience"><TagInput value={f.industries} onChange={(v) => setF({ ...f, industries: v })} placeholder="e.g. Fintech, press Enter" /></Field>
      </div>
      <Field label="Professional Summary" error={err.summary}
        hint={<span className={`text-xs ${f.summary.length > SUMMARY_MAX ? "text-destructive" : "text-muted-foreground"}`}>{f.summary.length} / {SUMMARY_MAX}</span>}>
        <textarea rows={6} className={inputCls} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} />
      </Field>
      <SaveBar saving={saving} onCancel={onDone} />
    </form>
  );
}

function PrefsView({ p }: { p: Profile }) {
  return (
    <dl className="grid gap-5 sm:grid-cols-2">
      <div><dt className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Target Roles</dt><Chips items={p.target_roles} /></div>
      <Item k="Desired Minimum Salary" v={formatSalaryAmount(p.salary_amount, p.salary_currency)} />
      <Item k="Career Mode" v={label(AVAILABILITY, p.availability)} />
      <Item k="Preferred Work Arrangement" v={label(ARRANGEMENTS, p.work_arrangement)} />
      <div><dt className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Locations Of Interest</dt><Chips items={p.locations_of_interest} /></div>
      <div><dt className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Target Industries</dt><Chips items={p.target_industries} /></div>
    </dl>
  );
}

function PreferencesForm({ p, uid, roleNames, onDone }: { p: Profile; uid: string; roleNames: string[]; onDone: () => void }) {
  const save = useSaveProfile(uid);
  const [f, setF] = useState({ target_roles: p.target_roles, salary_amount: p.salary_amount?.toString() ?? "", salary_currency: p.salary_currency || "USD", availability: p.availability, work_arrangement: p.work_arrangement, locations_of_interest: p.locations_of_interest, target_industries: p.target_industries });
  const [err, setErr] = useState("");
  const [salErr, setSalErr] = useState("");
  const [saving, setSaving] = useState(false);
  const choice = (opts: [string, string][], v: string, on: (v: string) => void) => (
    <div className="flex flex-wrap gap-2">{opts.map(([k, l]) => (
      <button type="button" key={k} onClick={() => on(k)} className={`rounded-xl border px-3 py-1.5 text-sm font-medium ${v === k ? "border-primary bg-primary-soft text-primary" : "border-border hover:border-primary/50"}`}>{l}</button>
    ))}</div>
  );
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!f.target_roles.length) { setErr("Select at least one target role."); toast.error("Missing required fields."); return; }
    const amt = parseSalaryInput(f.salary_amount);
    if (!amt.ok) { setErr(""); setSalErr(amt.error); return; }
    setErr(""); setSalErr(""); setSaving(true);
    const ok = await save({ ...f, salary_amount: amt.value, salary_currency: f.salary_currency }, "Career preferences saved");
    setSaving(false);
    if (ok) onDone();
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Target Roles *" error={err}><TagInput value={f.target_roles} onChange={(v) => setF({ ...f, target_roles: v })} options={roleNames} placeholder="Search roles…" /></Field>
      <Field label="Desired Minimum Salary" error={salErr}><div className="flex gap-2"><input className={inputCls} type="text" inputMode="numeric" pattern="[0-9]*" placeholder="60000" value={f.salary_amount} onChange={(e) => setF({ ...f, salary_amount: digitsOnly(e.target.value) })} /><select aria-label="Currency" className={`${inputCls} w-28`} value={f.salary_currency} onChange={(e) => setF({ ...f, salary_currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></div></Field>
      <div className="space-y-1.5"><p className="text-sm font-medium">Career Mode</p>{choice(AVAILABILITY, f.availability, (v) => setF({ ...f, availability: v }))}</div>
      <div className="space-y-1.5"><p className="text-sm font-medium">Preferred Work Arrangement</p>{choice(ARRANGEMENTS, f.work_arrangement, (v) => setF({ ...f, work_arrangement: v }))}</div>
      <Field label="Locations Of Interest"><TagInput value={f.locations_of_interest} onChange={(v) => setF({ ...f, locations_of_interest: v })} placeholder="e.g. Boston, MA — press Enter" /></Field>
      <Field label="Target Industries"><TagInput value={f.target_industries} onChange={(v) => setF({ ...f, target_industries: v })} placeholder="e.g. Healthcare — press Enter" /></Field>
      <SaveBar saving={saving} onCancel={onDone} />
    </form>
  );
}

function ResumeManager({ uid, p, onAutofill }: { uid: string; p: Profile; onAutofill: (f: File) => void }) {
  const save = useSaveProfile(uid);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  
  async function upload(file: File) {
    const bad = validateResumeFile(file);
    if (bad) { toast.error(bad); return; }
    setBusy(true);
    const safe = file.name.replace(/[^\w.-]+/g, "_").slice(-80);
    const path = `${uid}/${Date.now()}-${safe}`;
    const { error } = await supabase.storage.from("resumes").upload(path, file, { contentType: file.type || "application/octet-stream" });
    if (error) { setBusy(false); { toast.error(friendlyError(error, "Resume upload failed. Please try again.")); return; } }
    const old = p.resume_path;
    const ok = await save({ resume_path: path, resume_file_name: file.name, resume_uploaded_at: new Date().toISOString() }, old ? "Resume replaced" : "Resume uploaded");
    if (ok && old) await supabase.storage.from("resumes").remove([old]);
    if (!ok) await supabase.storage.from("resumes").remove([path]);
    setBusy(false);
    if (ok && isStorableResume(file)) onAutofill(file);
  }
  async function download() {
    if (!p.resume_path) return;
    const { data, error } = await supabase.storage.from("resumes").createSignedUrl(p.resume_path, 60, { download: p.resume_file_name ?? true });
    if (error || !data) { toast.error(friendlyError(error, "Couldn't download your resume.")); return; }
    window.location.href = data.signedUrl;
  }
  async function remove() {
    if (!p.resume_path || !window.confirm("Delete your resume?")) return;
    setBusy(true);
    const { error } = await supabase.storage.from("resumes").remove([p.resume_path]);
    if (error) { setBusy(false); { toast.error(friendlyError(error, "Couldn't delete your resume.")); return; } }
    await save({ resume_path: null, resume_file_name: null, resume_uploaded_at: null }, "Resume deleted");
    setBusy(false);
  }

  return (
    <div>
      <input ref={input} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(f); }} />
      {p.resume_path ? (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border p-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary"><FileText className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1"><p className="truncate font-semibold">{p.resume_file_name}</p>{p.resume_uploaded_at && <p className="text-xs text-muted-foreground">Uploaded {new Date(p.resume_uploaded_at).toLocaleDateString()}</p>}</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={download} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold hover:bg-muted"><Download className="h-4 w-4" />Download</button>
            <button onClick={() => input.current?.click()} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold hover:bg-muted"><Upload className="h-4 w-4" />Replace</button>
            <button onClick={remove} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/40 px-3 py-1.5 text-sm font-semibold text-destructive hover:bg-destructive/5"><Trash2 className="h-4 w-4" />Delete</button>
          </div>
        </div>
      ) : (
        <button onClick={() => input.current?.click()} disabled={busy} className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border p-8 text-center hover:border-primary hover:bg-primary-soft/30">
          <Upload className="h-7 w-7 text-primary" />
          <span className="font-semibold">{busy ? "Uploading…" : "Attach your resume for recruiters"}</span>
          <span className="text-xs text-muted-foreground">PDF or DOCX, up to 10 MB · We'll suggest profile updates from it</span>
        </button>
      )}
    </div>
  );
}

const VIS: [string, string, string][] = [
  ["recruiter_searchable", "Open to Talent Search", "Verified recruiters on Sundance can discover your profile and reach out with opportunities."],
  ["private", "Private (Applications Only)", "Hidden from recruiter search. Only hiring teams for jobs you apply to can see your profile."],
];

export type VisibilityProfile = Pick<Profile, "visibility_status" | "hide_from_current_employer" | "current_employer">;

/** The single editor for candidate visibility; rendered on the Settings page. */
export function VisibilityControls({ uid, p }: { uid: string; p: VisibilityProfile }) {
  const save = useSaveProfile(uid);
  // Legacy "public" behaves exactly like talent search.
  const current = p.visibility_status === "private" ? "private" : "recruiter_searchable";
  const [employer, setEmployer] = useState("");
  const needsEmployer = p.hide_from_current_employer && !p.current_employer?.trim();
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {VIS.map(([k, l, d]) => (
          <button key={k} type="button" aria-pressed={current === k} onClick={() => k !== current && save({ visibility_status: k as Profile["visibility_status"] }, "Visibility updated")}
            className={`rounded-xl border p-4 text-left transition-colors ${current === k ? "border-primary bg-primary-soft" : "border-border hover:border-primary/50"}`}>
            <p className={`flex items-center gap-1.5 font-semibold ${current === k ? "text-primary" : ""}`}>{k === "private" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{l}</p>
            <p className="mt-1 text-xs text-muted-foreground">{d}</p>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Your profile is never public on the internet or visible to other candidates. Applying to a job always lets that hiring team review your profile.</p>
      <div className="rounded-xl border border-border p-4">
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" checked={p.hide_from_current_employer}
            onChange={(e) => save({ hide_from_current_employer: e.target.checked }, e.target.checked ? "Hidden from current employer" : "Current employer protection disabled")} />
          <span><span className="block text-sm font-semibold">Hide From Current Employer</span><span className="text-xs text-muted-foreground">{p.current_employer?.trim() ? `Recruiters from ${p.current_employer} won't see your profile.` : "Add your current employer so we know who to hide you from."}</span></span>
        </label>
        {needsEmployer && (
          <form className="mt-3 flex flex-wrap gap-2 pl-7" onSubmit={(e) => { e.preventDefault(); const v = employer.trim(); if (v) save({ current_employer: v }, "Current employer saved"); }}>
            <input className={`${inputCls} flex-1`} placeholder="Your current company" value={employer} onChange={(e) => setEmployer(e.target.value)} aria-label="Current employer" />
            <button type="submit" disabled={!employer.trim()} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">Save</button>
          </form>
        )}
      </div>
    </div>
  );
}

function RecruiterPreview({ account, data, onBack }: { account: Account; data: Data; onBack: () => void }) {
  const p = data.profile!;
  const lk = (rows: LookupRow[]) => <div className="flex flex-wrap gap-1.5">{rows.length ? rows.map((r) => <span key={r.lookup_id} className="rounded-full border border-border px-3 py-1 text-xs font-medium">{r.name} · {cap(r.proficiency_level)} · {r.years_experience}y</span>) : <span className="text-sm text-muted-foreground">—</span>}</div>;
  const block = (title: string, body: React.ReactNode) => <section className={`${card} p-6`}><h2 className="mb-4 font-display text-lg font-bold">{title}</h2>{body}</section>;
  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-primary-soft p-4">
        <p className="text-sm font-medium text-primary"><Eye className="mr-1.5 inline h-4 w-4" />This is how recruiters see your profile.</p>
        <button onClick={onBack} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground"><ArrowLeft className="h-4 w-4" />Back to editing</button>
      </div>
      <section className={`${card} p-6`}>
        <div className="mb-3"><ProfilePhoto uid={account.userId} path={account.avatarPath} initials={`${account.firstName[0] ?? ""}${account.lastName[0] ?? ""}`.toUpperCase() || "?"} className="h-16 w-16 text-xl" /></div>
        <h1 className="font-display text-2xl font-extrabold">{account.firstName} {account.lastName}</h1>
        <p className="font-medium">{p.job_title}{!p.hide_from_current_employer && p.current_employer && <span className="text-muted-foreground"> · {p.current_employer}</span>}</p>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
          {p.location && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{p.location}</span>}
          <span>{p.years_experience} Years Experience</span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${availTone(p.availability)}`}>{label(AVAILABILITY, p.availability)}</span>
        </div>
        <div className="mt-4"><LinkBadges p={p} /></div>
      </section>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-6">
          {block("Professional Overview", <>
            {p.headline && <p className="font-medium">{p.headline}</p>}
            {p.summary && <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{p.summary}</p>}
            {p.industry_experience.length > 0 && <div className="mt-4"><Chips items={p.industry_experience} /></div>}
          </>)}
          {block("Work Experience", data.experience.length ? <ol className="space-y-5">{[...data.experience].sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? "")).map((x) => (
            <li key={x.experience_id} className="border-l-2 border-primary/30 pl-4"><p className="font-semibold">{x.job_title} · {x.company_name}</p><p className="text-xs text-muted-foreground">{x.location}</p>{x.responsibilities && <p className="mt-2 whitespace-pre-line text-sm">{x.responsibilities}</p>}</li>
          ))}</ol> : <p className="text-sm text-muted-foreground">—</p>)}
          {block("Projects", <ProjectList items={data.projects ?? []} />)}
          {block("Resume", <p className="text-sm text-muted-foreground">{p.resume_file_name ?? "No resume uploaded"}</p>)}
        </div>
        <div className="min-w-0 space-y-6">
          <section className={`${card} space-y-5 p-6`}>
            <h2 className="font-display text-lg font-bold">Skills & Technologies</h2>
            <div><p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Programming Languages</p>{lk(data.languages)}</div>
            <div><p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Technologies & Tools</p>{lk(data.technologies)}</div>
            <div><p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Technical Skills</p>{lk(data.skills)}</div>
            <div><p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Soft Skills</p><Chips items={(data.softSkills ?? []).map((id) => (data.softOpts ?? []).find((o) => o.id === id)?.name ?? "").filter(Boolean)} /></div>
            <div><p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Spoken Languages</p><Chips items={data.spokenLanguages.map((x) => `${x.language_name} · ${x.proficiency.replaceAll("_", " ")}`)} /></div>
          </section>
          {block("Education", data.education.length ? <ul className="space-y-3">{data.education.map((x) => <li key={x.education_id}><EducationLines e={x} /></li>)}</ul> : <p className="text-sm text-muted-foreground">—</p>)}
          {block("Certifications", data.certifications.length ? <ul className="space-y-3">{data.certifications.map((x) => <li key={x.certification_id}><p className="font-semibold">{x.certification_name}</p><p className="text-xs text-muted-foreground">{x.issuing_organization}</p></li>)}</ul> : <p className="text-sm text-muted-foreground">—</p>)}
          {block("Career Preferences", <PrefsView p={p} />)}
        </div>
      </div>
    </div>
  );
}

function RoleLevelItems({ p }: { p: Profile }) {
  const tax = useQuery({ queryKey: ["role-level-tax"], queryFn: loadTaxonomy, staleTime: 300_000 });
  const rn = (id: string | null) => tax.data?.allRoles.find((r) => r.id === id)?.name ?? "";
  const ln = (id: string | null) => tax.data?.levels.find((l) => l.id === id)?.name ?? "";
  return (<>
    <Item k="Current Role" v={[ln(p.current_level_id), rn(p.role_id)].filter(Boolean).join(" · ")} />
    <Item k="Target Role" v={[ln(p.target_level_id), rn(p.target_role_id)].filter(Boolean).join(" · ")} />
  </>);
}
