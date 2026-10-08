import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Check, Download, Eye, FileBadge2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAvatarUrl } from "@/components/app/ProfilePhoto";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createStandardResumePdf } from "@/lib/standard-resume-pdf";
import { DEFAULT_STANDARD_RESUME_SECTIONS, STANDARD_RESUME_MAX_SOFT_SKILLS, STANDARD_RESUME_PREMIUM_PREVIEW, STANDARD_RESUME_SECTION_LABELS, nextStandardResumeVersion, spokenLanguageLevelLabel, type ResumeChoice, type StandardResumeSection, type StandardResumeSnapshot } from "@/lib/standard-resume";
import type { Account } from "@/lib/account";
import type { SpokenLanguage } from "./SpokenLanguagesManager";

type Named = { name: string };
type Profile = { user_id: string; headline: string; location: string; summary: string; linkedin_url: string; github_url: string; portfolio_url: string; resume_path: string | null; resume_file_name: string | null; recruiter_resume_choice: string };
type Experience = { job_title: string; company_name: string; location: string; start_date: string | null; end_date: string | null; current_position: boolean; responsibilities: string; achievements: string; technologies_used: string[] };
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
    links: [["LinkedIn", p.linkedin_url], ["GitHub", p.github_url], ["Portfolio", p.portfolio_url]].filter((x) => x[1]).map(([label, url]) => ({ label, url })),
    summary: p.summary,
    experience: d.experience.map((e) => ({ title: e.job_title, company: e.company_name, location: e.location, start: e.start_date, end: e.end_date, current: e.current_position, responsibilities: e.responsibilities, achievements: e.achievements, technologies: e.technologies_used })),
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
  const move = (index: number, delta: -1 | 1) => setSections((current) => { const out = [...current]; const to = index + delta; if (to < 0 || to >= out.length) return current; [out[index], out[to]] = [out[to] as StandardResumeSection, out[index] as StandardResumeSection]; return out; });
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
  async function setChoice(value: ResumeChoice) { const { error } = await supabase.from("candidate_profiles").update({ recruiter_resume_choice: value }).eq("user_id", account.userId); if (error) return toast.error("Couldn't update the recruiter download choice."); toast.success(value === "standard" ? "Recruiters will receive your Sundance resume" : "Recruiters will receive your original resume"); await qc.invalidateQueries({ queryKey: ["candidate-full", account.userId] }); }
  async function download(v: Version) { const { data: signed, error } = await supabase.storage.from("resumes").createSignedUrl(v.pdf_path, 60, { download: `Sundance-Standard-Resume-v${v.version_number}.pdf` }); if (error || !signed) return toast.error("Resume download isn't available."); window.open(signed.signedUrl, "_blank", "noopener"); }

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

    <Dialog open={editor} onOpenChange={setEditor}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle>Create Sundance Standard Resume</DialogTitle><DialogDescription>Choose what appears, preview it, then publish an immutable numbered version. Personal email, salary, availability, and match scores are never included.</DialogDescription></DialogHeader>
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]"><div className="space-y-5">
        <label className="flex items-start gap-3 rounded-xl border border-border p-3"><input type="checkbox" checked={includePhoto} onChange={(e) => setIncludePhoto(e.target.checked)} className="mt-1 accent-primary" /><span><span className="block text-sm font-semibold">Include profile photo</span><span className="text-xs text-muted-foreground">Off by default. Photos may increase bias and are not customary in every region.</span></span></label>
        <div><p className="mb-2 text-sm font-semibold">Sections & order</p><ol className="space-y-1.5">{sections.map((section, index) => <li key={section} className="flex items-center gap-2 rounded-lg border border-border px-2 py-2 text-sm"><input type="checkbox" checked onChange={() => toggleSection(section)} className="accent-primary" /><span className="flex-1">{STANDARD_RESUME_SECTION_LABELS[section]}</span><button aria-label={`Move ${STANDARD_RESUME_SECTION_LABELS[section]} up`} disabled={!index} onClick={() => move(index, -1)}><ArrowUp className="h-4 w-4" /></button><button aria-label={`Move ${STANDARD_RESUME_SECTION_LABELS[section]} down`} disabled={index === sections.length - 1} onClick={() => move(index, 1)}><ArrowDown className="h-4 w-4" /></button></li>)}</ol>{DEFAULT_STANDARD_RESUME_SECTIONS.filter((s) => !sections.includes(s)).map((s) => <button key={s} onClick={() => toggleSection(s)} className="mr-2 mt-2 text-xs font-semibold text-primary">+ {STANDARD_RESUME_SECTION_LABELS[s]}</button>)}</div>
        {data.softSkillRows.length > 0 && <div><p className="text-sm font-semibold">Top soft skills <span className="font-normal text-muted-foreground">({softSkills.length}/{STANDARD_RESUME_MAX_SOFT_SKILLS})</span></p><div className="mt-2 flex flex-wrap gap-1.5">{data.softSkillRows.map((s) => <button key={s.name} type="button" onClick={() => toggleSoft(s.name)} className={`rounded-full border px-2.5 py-1 text-xs ${softSkills.includes(s.name) ? "border-primary bg-primary-soft text-primary" : "border-border"}`}>{s.name}</button>)}</div></div>}
        <div className="flex gap-2"><Button variant="outline" onClick={() => setPreview(true)}><Eye className="h-4 w-4" />Preview</Button><Button disabled={publishing} onClick={publish}>{publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Publish v{nextStandardResumeVersion(data.standardResumes.map((v) => v.version_number))}</Button></div>
      </div><ResumeDocument snapshot={snapshot} sections={sections} includePhoto={includePhoto} photoUrl={avatarUrl} /></div>
    </DialogContent></Dialog>
    <Dialog open={preview} onOpenChange={setPreview}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>Sundance Standard Resume Preview</DialogTitle><DialogDescription>{latest ? `Published version ${latest.version_number}` : "Draft preview"}</DialogDescription></DialogHeader><ResumeDocument snapshot={latest ? latest.snapshot as StandardResumeSnapshot : snapshot} sections={(latest?.section_order as StandardResumeSection[] | undefined) ?? sections} includePhoto={latest?.include_photo ?? includePhoto} photoUrl={avatarUrl} /></DialogContent></Dialog>
    {STANDARD_RESUME_PREMIUM_PREVIEW && <p className="text-xs text-muted-foreground">Premium Preview is free for everyone during early access.</p>}
  </div>;
}

function ResumeDocument({ snapshot, sections, includePhoto, photoUrl }: { snapshot: StandardResumeSnapshot; sections: StandardResumeSection[]; includePhoto: boolean; photoUrl: string | null }) {
  const content: Record<StandardResumeSection, React.ReactNode> = {
    summary: snapshot.summary && <p>{snapshot.summary}</p>,
    experience: <div className="space-y-4">{snapshot.experience.map((e, i) => <div key={`${e.company}-${i}`}><p className="font-semibold">{e.title} · {e.company}</p><p className="text-xs text-muted-foreground">{[e.location, e.start && `${e.start.slice(0, 7)} – ${e.current ? "Present" : e.end?.slice(0, 7) ?? ""}`].filter(Boolean).join(" · ")}</p>{e.responsibilities && <p className="mt-1">{e.responsibilities}</p>}{e.achievements && <p className="mt-1 text-muted-foreground">Achievements: {e.achievements}</p>}</div>)}</div>,
    skills: <p>{snapshot.skills.join(" • ")}</p>, technologies: <p>{snapshot.technologies.join(" • ")}</p>, programming_languages: <p>{snapshot.programmingLanguages.join(" • ")}</p>, soft_skills: <p>{snapshot.softSkills.join(" • ")}</p>,
    education: <div className="space-y-2">{snapshot.education.map((e, i) => <p key={`${e.institution}-${i}`}><strong>{[e.degree, e.field].filter(Boolean).join(" in ")}</strong><br /><span className="text-muted-foreground">{e.institution}{e.year ? ` · ${e.year}` : ""}</span></p>)}</div>,
    certifications: <div className="space-y-2">{snapshot.certifications.map((c, i) => <p key={`${c.name}-${i}`}><strong>{c.name}</strong><br /><span className="text-muted-foreground">{[c.issuer, c.issued].filter(Boolean).join(" · ")}</span></p>)}</div>,
    spoken_languages: <p>{snapshot.spokenLanguages.map((l) => `${l.name} — ${l.proficiency}`).join(" • ")}</p>,
    projects: <div className="space-y-2">{snapshot.projects.map((p, i) => <p key={`${p.title}-${i}`}><strong>{p.title}</strong>{p.description && <> · {p.description}</>}</p>)}</div>,
  };
  return <article className="mx-auto min-h-[760px] w-full max-w-[720px] bg-card p-8 text-sm text-foreground shadow-elevated sm:p-12"><header className="flex gap-6 border-b-2 border-primary pb-5"><div className="flex-1"><h2 className="font-display text-3xl font-extrabold">{snapshot.name}</h2><p className="mt-1 text-base font-semibold text-primary">{snapshot.headline}</p><p className="mt-2 text-xs text-muted-foreground">{[snapshot.location, ...snapshot.links.map((l) => l.url.replace(/^https?:\/\//, ""))].filter(Boolean).join(" • ")}</p></div>{includePhoto && photoUrl && <img src={photoUrl} alt="" className="h-20 w-20 rounded-sm object-cover" />}</header><div className="mt-5 space-y-5">{sections.map((section) => content[section] && <section key={section}><h3 className="mb-2 border-b border-primary/20 pb-1 text-xs font-bold uppercase text-primary">{STANDARD_RESUME_SECTION_LABELS[section]}</h3>{content[section]}</section>)}</div></article>;
}
