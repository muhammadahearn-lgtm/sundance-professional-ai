import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Download, Eye, FileBadge2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAvatarUrl } from "@/components/app/ProfilePhoto";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createStandardResumePdf } from "@/lib/standard-resume-pdf";
import { DEFAULT_STANDARD_RESUME_SECTIONS, STANDARD_RESUME_MAX_SOFT_SKILLS, STANDARD_RESUME_PREMIUM_PREVIEW, STANDARD_RESUME_SECTION_LABELS, nextStandardResumeVersion, resumePeriod, budgetResume, earlierRoleLine, responsibilityItems, RESUME_LIMITS, spokenLanguageLevelLabel, type ResumeChoice, type StandardResumeSection, type StandardResumeSnapshot } from "@/lib/standard-resume";
import type { Account } from "@/lib/account";
import type { SpokenLanguage } from "./SpokenLanguagesManager";

type Named = { name: string };
type Profile = { user_id: string; headline: string; location: string; summary: string; linkedin_url: string; github_url: string; portfolio_url: string; resume_path: string | null; resume_file_name: string | null; recruiter_resume_choice: string };
type Experience = { job_title: string; company_name: string; location: string; start_date: string | null; end_date: string | null; current_position: boolean; responsibilities: string; technologies_used: string[] };
type Education = { institution_name: string; degree: string; degree_type: string | null; field_of_study: string; graduation_year: number | null };
type Certification = { certification_name: string; issuing_organization: string; issue_date: string | null };
type Project = { title: string; description: string; project_url: string; technologies: string[] };
type Version = { standard_resume_id: string; version_number: number; snapshot: unknown; pdf_path: string; include_photo: boolean; section_order: string[]; published_at: string };

export type StandardResumeData = {
  profile: Profile; experience: Experience[]; education: Education[]; certifications: Certification[];
  languages: Named[]; skills: Named[]; technologies: Named[]; softSkillRows: Named[]; spokenLanguages: SpokenLanguage[]; projects: Project[]; standardResumes: Version[];
};

function buildSnapshot(account: Account, d: StandardResumeData, softSkills: string[]): StandardResumeSnapshot {
  const p = d.profile;
  return {
    name: `${account.firstName} ${account.lastName}`.trim(), headline: p.headline, location: p.location,
    links: [["LinkedIn", p.linkedin_url], ["GitHub", p.github_url], ["Portfolio", p.portfolio_url]].flatMap(([label, url]) => url ? [{ label: label!, url }] : []),
    summary: p.summary,
    experience: d.experience.map((e) => ({ title: e.job_title, company: e.company_name, location: e.location, start: e.start_date, end: e.end_date, current: e.current_position, responsibilities: e.responsibilities, technologies: e.technologies_used })),
    skills: d.skills.map((x) => x.name), technologies: d.technologies.map((x) => x.name), programmingLanguages: d.languages.map((x) => x.name), softSkills,
    education: d.education.map((e) => ({ institution: e.institution_name, degree: e.degree_type || e.degree, field: e.field_of_study, year: e.graduation_year })),
    certifications: d.certifications.map((c) => ({ name: c.certification_name, issuer: c.issuing_organization, issued: c.issue_date })),
    spokenLanguages: d.spokenLanguages.map((l) => ({ name: l.language_name, proficiency: spokenLanguageLevelLabel(l.proficiency) })),
    projects: d.projects.map((p2) => ({ title: p2.title, description: p2.description, url: p2.project_url, technologies: p2.technologies })),
  };
}

export function StandardResumeWorkspace({ account, data }: { account: Account; data: StandardResumeData }) {
  const qc = useQueryClient(); const avatarUrl = useAvatarUrl(account.avatarPath);
  const [editor, setEditor] = useState(false); const [preview, setPreview] = useState(false); const [publishing, setPublishing] = useState(false);
  const [includePhoto, setIncludePhoto] = useState(false); const [sections, setSections] = useState<StandardResumeSection[]>(DEFAULT_STANDARD_RESUME_SECTIONS);
  const [softSkills, setSoftSkills] = useState(data.softSkillRows.slice(0, STANDARD_RESUME_MAX_SOFT_SKILLS).map((x) => x.name));
  const latest = data.standardResumes[0]; const snapshot = useMemo(() => buildSnapshot(account, data, softSkills), [account, data, softSkills]);
  const choice = data.profile.recruiter_resume_choice as ResumeChoice;
  const toggleSection = (section: StandardResumeSection) => setSections((current) => current.includes(section) ? current.filter((s) => s !== section) : [...current, section]);
  const toggleSoft = (name: string) => setSoftSkills((current) => current.includes(name) ? current.filter((x) => x !== name) : current.length >= STANDARD_RESUME_MAX_SOFT_SKILLS ? (toast.error(`Choose up to ${STANDARD_RESUME_MAX_SOFT_SKILLS} soft skills.`), current) : [...current, name]);

  async function publish() {
    setPublishing(true);
    try {
      let photo: { bytes: ArrayBuffer; type: string } | null = null;
      if (includePhoto && avatarUrl) { const response = await fetch(avatarUrl); photo = { bytes: await response.arrayBuffer(), type: response.headers.get("content-type") ?? "image/jpeg" }; }
      const pdf = await createStandardResumePdf(snapshot, sections, photo);
      const version = nextStandardResumeVersion(data.standardResumes.map((v) => v.version_number));
      const path = `${account.userId}/standard/sundance-standard-resume-v${version}.pdf`;
      const uploaded = await supabase.storage.from("resumes").upload(path, pdf, { contentType: "application/pdf", upsert: false });
      if (uploaded.error) throw uploaded.error;
      const saved = await supabase.from("standard_resume_versions").insert({ candidate_id: account.userId, version_number: version, snapshot, pdf_path: path, include_photo: includePhoto, section_order: sections }).select("standard_resume_id").single();
      if (saved.error) { await supabase.storage.from("resumes").remove([path]); throw saved.error; }
      if (!latest) await supabase.from("candidate_profiles").update({ recruiter_resume_choice: "standard" }).eq("user_id", account.userId);
      toast.success(`Sundance Standard Resume v${version} published`); setEditor(false); await qc.invalidateQueries({ queryKey: ["candidate-full", account.userId] });
    } catch { toast.error("We couldn't publish the resume. Please try again."); }
    setPublishing(false);
  }
  async function setChoice(value: ResumeChoice) { const { error } = await supabase.from("candidate_profiles").update({ recruiter_resume_choice: value }).eq("user_id", account.userId); if (error) { toast.error("Couldn't update the recruiter download choice."); return; } toast.success(value === "standard" ? "Recruiters will receive your Sundance resume" : "Recruiters will receive your original resume"); await qc.invalidateQueries({ queryKey: ["candidate-full", account.userId] }); }
  async function download(v: Version) { const { data: signed, error } = await supabase.storage.from("resumes").createSignedUrl(v.pdf_path, 60, { download: `Sundance-Standard-Resume-v${v.version_number}.pdf` }); if (error || !signed) { toast.error("Resume download isn't available."); return; } window.open(signed.signedUrl, "_blank", "noopener"); }

  return <div className="space-y-4">
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-xl border border-border p-4"><div className="flex items-start gap-3"><FileBadge2 className="mt-0.5 h-5 w-5 text-primary" /><div><p className="font-semibold">Sundance Standard Resume</p><p className="text-xs text-muted-foreground">Consistent, ATS-friendly, and built only from profile details you confirmed.</p></div><span className="ml-auto rounded-full bg-primary-soft px-2 py-1 text-[10px] font-bold uppercase text-primary">Premium Preview</span></div>
        {latest ? <div className="mt-4 flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">Published v{latest.version_number}</span><span className="text-xs text-muted-foreground">{new Date(latest.published_at).toLocaleDateString()}</span><Button size="sm" variant="outline" onClick={() => { setPreview(true); }}><Eye className="h-4 w-4" />Preview</Button><Button size="sm" variant="outline" onClick={() => download(latest)}><Download className="h-4 w-4" />PDF</Button></div> : <p className="mt-4 text-sm text-muted-foreground">Create your first polished version when your profile is ready.</p>}
        <Button className="mt-4" onClick={() => setEditor(true)}><Sparkles className="h-4 w-4" />{latest ? "Publish New Version" : "Create Sundance Resume"}</Button>
      </div>
      <div className="rounded-xl border border-border p-4"><p className="font-semibold">Recruiter Download Choice</p><p className="mt-1 text-xs text-muted-foreground">Choose the version recruiters receive first. Both remain under your control.</p><div className="mt-4 grid gap-2">
        {(["original", "standard"] as ResumeChoice[]).map((value) => { const disabled = value === "original" ? !data.profile.resume_path : !latest; return <button key={value} type="button" disabled={disabled} onClick={() => setChoice(value)} className={`flex items-center gap-3 rounded-xl border p-3 text-left text-sm disabled:opacity-50 ${choice === value ? "border-primary bg-primary-soft text-primary" : "border-border"}`}><span className={`grid h-5 w-5 place-items-center rounded-full border ${choice === value ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{choice === value && <Check className="h-3 w-3" />}</span><span><strong className="block">{value === "original" ? "Original resume" : "Sundance Standard Resume"}</strong><span className="text-xs text-muted-foreground">{disabled ? "Not available yet" : value === "original" ? data.profile.resume_file_name : `Published v${latest?.version_number}`}</span></span></button>; })}
      </div>
    </div>
    </div>

    <Dialog open={editor} onOpenChange={setEditor}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle>Create Sundance Standard Resume</DialogTitle><DialogDescription>Choose what appears, preview it, then publish an immutable numbered version. Personal email, salary, availability, and match scores are never included.</DialogDescription></DialogHeader>
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]"><div className="space-y-5">
        <label className="flex items-start gap-3 rounded-xl border border-border p-3"><input type="checkbox" checked={includePhoto} onChange={(e) => setIncludePhoto(e.target.checked)} className="mt-1 accent-primary" /><span><span className="block text-sm font-semibold">Include profile photo</span><span className="text-xs text-muted-foreground">Off by default. Photos may increase bias and are not customary in every region.</span></span></label>
        <div><p className="mb-2 text-sm font-semibold">Sections to include</p><ul className="space-y-1.5">{DEFAULT_STANDARD_RESUME_SECTIONS.map((section) => <li key={section}><label className="flex items-center gap-2 rounded-lg border border-border px-2 py-2 text-sm"><input type="checkbox" checked={sections.includes(section)} onChange={() => toggleSection(section)} className="accent-primary" /><span className="flex-1">{STANDARD_RESUME_SECTION_LABELS[section]}</span></label></li>)}</ul><p className="mt-2 text-xs text-muted-foreground">Fits one A4 page for most profiles (two for long careers): your {RESUME_LIMITS.fullExperience} most recent roles in full, older roles on one line, and your {RESUME_LIMITS.certifications} latest certifications.</p></div>
        {data.softSkillRows.length > 0 && <div><p className="text-sm font-semibold">Top soft skills <span className="font-normal text-muted-foreground">({softSkills.length}/{STANDARD_RESUME_MAX_SOFT_SKILLS})</span></p><div className="mt-2 flex flex-wrap gap-1.5">{data.softSkillRows.map((s) => <button key={s.name} type="button" onClick={() => toggleSoft(s.name)} className={`rounded-full border px-2.5 py-1 text-xs ${softSkills.includes(s.name) ? "border-primary bg-primary-soft text-primary" : "border-border"}`}>{s.name}</button>)}</div></div>}
        <div className="flex gap-2"><Button variant="outline" onClick={() => setPreview(true)}><Eye className="h-4 w-4" />Preview</Button><Button disabled={publishing} onClick={publish}>{publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Publish v{nextStandardResumeVersion(data.standardResumes.map((v) => v.version_number))}</Button></div>
      </div><ResumeDocument snapshot={snapshot} sections={sections} includePhoto={includePhoto} photoUrl={avatarUrl} /></div>
    </DialogContent></Dialog>
    <Dialog open={preview} onOpenChange={setPreview}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>Sundance Standard Resume Preview</DialogTitle><DialogDescription>{latest ? `Published version ${latest.version_number}` : "Draft preview"}</DialogDescription></DialogHeader><ResumeDocument snapshot={latest ? latest.snapshot as StandardResumeSnapshot : snapshot} sections={(latest?.section_order as StandardResumeSection[] | undefined) ?? sections} includePhoto={latest?.include_photo ?? includePhoto} photoUrl={avatarUrl} /></DialogContent></Dialog>
    {STANDARD_RESUME_PREMIUM_PREVIEW && <p className="text-xs text-muted-foreground">Premium Preview is free for everyone during early access.</p>}
  </div>;
}

function ResumeDocument({ snapshot, sections, includePhoto, photoUrl }: { snapshot: StandardResumeSnapshot; sections: StandardResumeSection[]; includePhoto: boolean; photoUrl: string | null }) {
  const has = (s: StandardResumeSection) => sections.includes(s);
  const H = ({ children }: { children: React.ReactNode }) => <h3 className="mb-2.5 border-b border-primary/20 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">{children}</h3>;
  const b = budgetResume(snapshot);
  const edu = has("education") ? b.education : []; const certs = has("certifications") ? b.certifications : [];
  const exp = has("experience") ? b.experience : []; const earlier = has("experience") ? b.earlier : []; const proj = has("projects") ? b.projects : [];
  const groups: [string, string[]][] = [
    ["Technical skills", has("skills") ? snapshot.skills : []],
    ["Programming languages", has("programming_languages") ? snapshot.programmingLanguages : []],
    ["Tools & technologies", has("technologies") ? snapshot.technologies : []],
    ["Soft skills", has("soft_skills") ? snapshot.softSkills : []],
  ].filter(([, v]) => (v as string[]).length) as [string, string[]][];
  const spoken = has("spoken_languages") ? snapshot.spokenLanguages : [];
  return <article className="mx-auto aspect-[210/297] w-full max-w-[720px] overflow-hidden bg-card text-[12px] leading-relaxed text-foreground shadow-elevated">
    <header className="flex items-center gap-5 border-b-2 border-primary px-8 pb-5 pt-8">
      {includePhoto && photoUrl && <img src={photoUrl} alt="" className="h-16 w-16 rounded-sm object-cover" />}
      <div><h2 className="font-display text-2xl font-extrabold leading-tight">{snapshot.name}</h2><p className="text-sm font-semibold text-primary">{snapshot.headline}</p>{snapshot.location && <p className="mt-0.5 text-[11px] text-muted-foreground">{snapshot.location}</p>}</div>
    </header>
    <div className="grid h-full grid-cols-[32%_1fr]">
      <aside className="space-y-5 bg-primary-soft/40 px-6 py-5">
        {(groups.length > 0 || spoken.length > 0) && <section><H>Skills & Languages</H><div className="space-y-2.5">
          {groups.map(([label, v]) => <div key={label}><p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><p>{v.join(" · ")}</p></div>)}
          {spoken.length > 0 && <div className={groups.length ? "pt-1" : ""}><p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Languages</p><div className="mt-1 space-y-1">{spoken.map((l) => <div key={l.name} className="flex items-baseline justify-between gap-2"><span className="min-w-0 break-words">{l.name}</span><span className="shrink-0 text-[10px] text-muted-foreground">{l.proficiency}</span></div>)}</div></div>}
        </div></section>}
      </aside>
      <main className="space-y-5 px-6 py-5">
        {has("summary") && snapshot.summary && <section><H>PROFILE SUMMARY</H><p>{snapshot.summary}</p></section>}
        {(exp.length > 0 || proj.length > 0) && <section><H>{exp.length && proj.length ? "Experience & Projects" : exp.length ? "Experience" : "Projects"}</H><div className="space-y-3.5">
          {exp.map((e, i) => <div key={`x${i}`}><div className="flex items-baseline justify-between gap-3"><p className="text-[13px] font-semibold">{e.title}</p><span className="shrink-0 text-[10px] text-muted-foreground">{resumePeriod(e)}</span></div><p className="text-[11px] text-muted-foreground">{[e.company, e.location].filter(Boolean).join(" · ")}</p>{(() => { const items = responsibilityItems(e.responsibilities); return items.length > 1 ? <ul className="mt-1 space-y-0.5">{items.map((t, k) => <li key={k} className="flex gap-1.5"><span className="text-primary">•</span><span>{t}</span></li>)}</ul> : items[0] ? <p className="mt-1">{items[0]}</p> : null; })()}{e.technologies.length > 0 && <p className="mt-1 text-[10px] text-muted-foreground">Tech stack: {e.technologies.join(" · ")}</p>}</div>)}
          {earlier.length > 0 && <p className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground">Earlier experience: </span>{earlier.map(earlierRoleLine).join(" · ")}</p>}
          {proj.length > 0 && exp.length > 0 && <p className="pt-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Projects</p>}
          {proj.map((p, i) => <div key={`p${i}`}><p className="font-semibold">{p.title}</p>{p.description && <p>{p.description}</p>}{p.technologies.length > 0 && <p className="text-[10px] text-muted-foreground">Tech stack: {p.technologies.join(" · ")}</p>}</div>)}
        </div></section>}
        {edu.length > 0 && <section><H>Education</H><div className="space-y-2">
          {edu.map((e, i) => <div key={`e${i}`}><div className="flex items-baseline justify-between gap-3"><p className="font-semibold">{[e.degree, e.field].filter(Boolean).join(" in ")}</p><span className="shrink-0 text-[10px] text-muted-foreground">{e.year ?? ""}</span></div><p className="text-[11px] text-muted-foreground">{e.institution}</p></div>)}
        </div></section>}
        {certs.length > 0 && <section><H>Certifications</H><div className="space-y-2">
          {certs.map((c, i) => <div key={`c${i}`}><div className="flex items-baseline justify-between gap-3"><p className="font-semibold">{c.name}</p><span className="shrink-0 text-[10px] text-muted-foreground">{c.issued?.slice(0, 4) ?? ""}</span></div><p className="text-[11px] text-muted-foreground">{c.issuer}</p></div>)}
        </div></section>}
      </main>
    </div>
    <p className="px-8 pb-3 text-[9px] text-muted-foreground">Verified candidate profile · Sundance Professionals</p>
  </article>;
}
