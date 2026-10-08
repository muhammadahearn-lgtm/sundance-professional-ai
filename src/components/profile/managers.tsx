import { optionMatches } from "@/lib/taxonomy-aliases";
import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SearchPicker } from "@/components/taxonomy/SearchPicker";
import { EducationLines } from "./EducationLines";
import { DEGREE_TYPES, gradYearError, isDegreeType, normalizeEduText } from "@/lib/education";
import { toast } from "sonner";
import { BadgeCheck, Check, Pencil, Plus, Trash2, Search } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { suggestCertification } from "@/lib/certification-suggest.functions";
import { catalogLabel, certKey, exactCatalogMatch, normalizeCertName, searchCatalog, type CatalogCert } from "@/lib/certifications";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { addTaxonomyEntry, canAddTaxonomy, KIND_LABEL, newEntryName, type TaxonomyKind } from "@/lib/taxonomy-add";
import { CategoryGuardAdd } from "@/components/taxonomy/CategoryGuardAdd";
import { RecGroups } from "@/components/taxonomy/RecGroups";
import { DatePicker } from "@/components/ui/date-picker";
import { Empty, Field, SaveBar, PROFICIENCY, cap, friendlyError, inputCls, type Proficiency } from "./parts";
import { KNOWN_FIELDS, resolveFieldOfStudy } from "@/lib/education-field-aliases";
import { KNOWN_INSTITUTIONS, resolveInstitution } from "@/lib/institution-aliases";
import { TagPicker, TextPicker, newTextName } from "@/components/taxonomy/TextPicker";
import { newCompanyName } from "@/lib/company-add";

type Exp = Tables<"work_experience">;
type Edu = Tables<"education">;
type Cert = Tables<"certifications">;

const fmtDate = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "");
const iconBtn = "grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground";

function useRefresh(uid: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["candidate-full", uid] });
}

async function confirmDelete(table: "work_experience" | "education" | "certifications", col: string, id: string) {
  if (!window.confirm("Delete this entry?")) return false;
  const { error } = await supabase.from(table).delete().eq(col, id);
  if (error) { toast.error(friendlyError(error, "Couldn't delete. Please try again.")); return false; }
  return true;
}

/* ---------------- Experience ---------------- */
export function ExperienceManager({ uid, items, adding, setAdding }: { uid: string; items: Exp[]; adding: boolean; setAdding: (v: boolean) => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const refresh = useRefresh(uid);
  const sorted = [...items].sort((a, b) => Number(b.current_position) - Number(a.current_position) || (b.start_date ?? "").localeCompare(a.start_date ?? ""));
  return (
    <div className="space-y-4">
      {adding && <ExperienceForm uid={uid} onDone={() => { setAdding(false); refresh(); }} onCancel={() => setAdding(false)} />}
      {!sorted.length && !adding && <Empty>No work experience yet. Add your roles to improve matching.</Empty>}
      <ol className="relative space-y-6 border-l-2 border-primary-soft pl-6">
        {sorted.map((x) => editing === x.experience_id ? (
          <li key={x.experience_id}><ExperienceForm uid={uid} item={x} onDone={() => { setEditing(null); refresh(); }} onCancel={() => setEditing(null)} /></li>
        ) : (
          <li key={x.experience_id} className="relative">
            <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-card" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{x.job_title}</p>
                <p className="text-sm text-muted-foreground">{x.company_name}{x.location && ` · ${x.location}`}{x.industry && ` · ${x.industry}`}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(x.start_date)} – {x.current_position ? "Present" : fmtDate(x.end_date)}</p>
              </div>
              <div className="flex shrink-0">
                <button className={iconBtn} aria-label="Edit experience" onClick={() => setEditing(x.experience_id)}><Pencil className="h-4 w-4" /></button>
                <button className={iconBtn} aria-label="Delete experience" onClick={async () => { if (await confirmDelete("work_experience", "experience_id", x.experience_id)) { toast.success("Experience deleted"); refresh(); } }}><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            {x.responsibilities && <p className="mt-2 whitespace-pre-line text-sm">{x.responsibilities}</p>}
            {x.technologies_used.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{x.technologies_used.map((t) => <span key={t} className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs text-primary">{t}</span>)}</div>}
          </li>
        ))}
      </ol>
    </div>
  );
}

function ExperienceForm({ uid, item, onDone, onCancel }: { uid: string; item?: Exp; onDone: () => void; onCancel: () => void }) {
  const [f, setF] = useState({
    company_name: item?.company_name ?? "", job_title: item?.job_title ?? "", industry: item?.industry ?? "", location: item?.location ?? "",
    start_date: item?.start_date ?? "", end_date: item?.end_date ?? "", current_position: item?.current_position ?? false,
    responsibilities: item?.responsibilities ?? "", technologies_used: item?.technologies_used ?? [],
  });
  const [err, setErr] = useState<Partial<Record<keyof typeof f, string>>>({});
  const [saving, setSaving] = useState(false);
  const catalog = useQuery({
    queryKey: ["company-catalog"], staleTime: 3600_000,
    queryFn: async () => (await supabase.from("companies").select("company_name, industry").eq("is_catalog", true).order("company_name")).data ?? [],
  });
  const techs = useQuery({
    queryKey: ["technology-names"], staleTime: 3600_000,
    queryFn: async () => ((await supabase.from("technologies").select("technology_name").order("technology_name")).data ?? []).map((t) => t.technology_name),
  });
  const pickCompany = (v: string) => {
    const hit = catalog.data?.find((c) => c.company_name.toLowerCase() === v.trim().toLowerCase());
    setF((p) => ({ ...p, company_name: v, industry: hit && !p.industry ? hit.industry : p.industry }));
  };
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Partial<Record<keyof typeof f, string>> = {};
    if (!f.company_name.trim()) er.company_name = "Company is required.";
    if (!f.job_title.trim()) er.job_title = "Job title is required.";
    if (!f.start_date) er.start_date = "Start date is required.";
    if (!f.current_position && f.end_date && f.start_date && f.end_date < f.start_date) er.end_date = "End date must be after start date.";
    setErr(er); if (Object.keys(er).length) return;
    setSaving(true);
    const row = { ...f, company_name: f.company_name.trim(), job_title: f.job_title.trim(), end_date: f.current_position || !f.end_date ? null : f.end_date };
    const { error } = item
      ? await supabase.from("work_experience").update(row).eq("experience_id", item.experience_id)
      : await supabase.from("work_experience").insert({ ...row, candidate_id: uid });
    setSaving(false);
    if (error) { toast.error(friendlyError(error, "Profile save failed. Please try again.")); return; }
    toast.success(item ? "Experience updated" : "Experience added"); onDone();
  }
  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-primary/30 bg-primary-soft/30 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company Name *" error={err.company_name}><TextPicker ariaLabel="Company name" options={(catalog.data ?? []).map((c) => c.company_name)} value={f.company_name} onChange={pickCompany} placeholder="Search companies…" nameFor={newCompanyName} addHint="Not listed? Add your employer — it's saved to your profile." /></Field>
        <Field label="Job Title *" error={err.job_title}><input className={inputCls} maxLength={150} value={f.job_title} onChange={(e) => set("job_title", e.target.value)} /></Field>
        <Field label="Industry"><input className={inputCls} maxLength={100} value={f.industry} onChange={(e) => set("industry", e.target.value)} /></Field>
        <Field label="Location"><input className={inputCls} maxLength={100} value={f.location} onChange={(e) => set("location", e.target.value)} /></Field>
        <Field label="Start Date *" error={err.start_date}><DatePicker aria-label="Start date" value={f.start_date} max={f.end_date || undefined} onChange={(v) => set("start_date", v)} placeholder="Select start date" /></Field>
        <Field label="End Date" error={err.end_date}><DatePicker aria-label="End date" disabled={f.current_position} value={f.current_position ? "" : f.end_date} min={f.start_date || undefined} onChange={(v) => set("end_date", v)} placeholder={f.current_position ? "Present" : "Select end date"} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.current_position} onChange={(e) => set("current_position", e.target.checked)} className="h-4 w-4 accent-primary" /> I currently work here</label>
      <Field label="Responsibilities"><textarea rows={3} maxLength={2000} className={inputCls} value={f.responsibilities} onChange={(e) => set("responsibilities", e.target.value)} /></Field>
      <Field label="Technologies Used"><TagPicker ariaLabel="Technologies used" options={techs.data ?? []} value={f.technologies_used} onChange={(v) => set("technologies_used", v)} placeholder="Search tools & technologies…" max={60} /></Field>
      <SaveBar saving={saving} onCancel={onCancel} />
    </form>
  );
}

/* ---------------- Education ---------------- */
export function EducationManager({ uid, items, adding, setAdding }: { uid: string; items: Edu[]; adding: boolean; setAdding: (v: boolean) => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const refresh = useRefresh(uid);
  const sorted = [...items].sort((a, b) => (b.graduation_year ?? 0) - (a.graduation_year ?? 0));
  return (
    <div className="space-y-4">
      {adding && <EducationForm uid={uid} onDone={() => { setAdding(false); refresh(); }} onCancel={() => setAdding(false)} />}
      {!sorted.length && !adding && <Empty>No education added yet.</Empty>}
      <div className="grid gap-3 sm:grid-cols-2">
        {sorted.map((x) => editing === x.education_id ? (
          <div key={x.education_id} className="sm:col-span-2"><EducationForm uid={uid} item={x} onDone={() => { setEditing(null); refresh(); }} onCancel={() => setEditing(null)} /></div>
        ) : (
          <div key={x.education_id} className="flex items-start justify-between gap-2 rounded-xl border border-border p-4">
            <EducationLines e={x} />
            <div className="flex shrink-0">
              <button className={iconBtn} aria-label="Edit education" onClick={() => setEditing(x.education_id)}><Pencil className="h-4 w-4" /></button>
              <button className={iconBtn} aria-label="Delete education" onClick={async () => { if (await confirmDelete("education", "education_id", x.education_id)) { toast.success("Education deleted"); refresh(); } }}><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const DEGREE_OPTS = DEGREE_TYPES.map((d) => ({ id: d, name: d }));
function EducationForm({ uid, item, onDone, onCancel }: { uid: string; item?: Edu; onDone: () => void; onCancel: () => void }) {
  const [f, setF] = useState({ institution_name: item?.institution_name ?? "", degree_type: item?.degree_type ?? "", field_of_study: item?.field_of_study ?? "", graduation_year: item?.graduation_year?.toString() ?? "" });
  const [err, setErr] = useState<Partial<Record<keyof typeof f, string>>>({});
  const [saving, setSaving] = useState(false);
  const sugg = useQuery({ queryKey: ["education-suggestions"], queryFn: async () => { const { data } = await supabase.rpc("education_suggestions"); return data ?? []; } });
  const fields = [...new Set([...COMMON_FIELDS, ...KNOWN_FIELDS, ...(sugg.data ?? []).filter((s) => s.kind === "field").map((s) => s.name)])].sort();
  const schools = [...new Set([...KNOWN_INSTITUTIONS, ...(sugg.data ?? []).filter((s) => s.kind === "institution").map((s) => s.name)])].sort();
  const fieldName = (q: string, o: { name: string }[]) => resolveFieldOfStudy(q) ?? newTextName(q, o, 100);
  const schoolName = (q: string, o: { name: string }[]) => resolveInstitution(q) ?? newTextName(q, o);
  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Partial<Record<keyof typeof f, string>> = {};
    if (!f.degree_type || !isDegreeType(f.degree_type)) er.degree_type = "Pick a degree type.";
    if (!f.field_of_study.trim()) er.field_of_study = "Field of study is required.";
    if (!f.institution_name.trim()) er.institution_name = "Institution is required.";
    const ye = gradYearError(f.graduation_year.trim()); if (ye) er.graduation_year = ye;
    setErr(er); if (Object.keys(er).length) return;
    setSaving(true);
    const row = { institution_name: normalizeEduText(f.institution_name), degree_type: f.degree_type, degree: f.degree_type, field_of_study: normalizeEduText(f.field_of_study), graduation_year: f.graduation_year ? Number(f.graduation_year) : null };
    const { error } = item ? await supabase.from("education").update(row).eq("education_id", item.education_id) : await supabase.from("education").insert({ ...row, candidate_id: uid });
    setSaving(false);
    if (error) { toast.error(friendlyError(error, "Profile save failed. Please try again.")); return; }
    toast.success(item ? "Education updated" : "Education added"); onDone();
  }
  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-primary/30 bg-primary-soft/30 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Degree Type *" error={err.degree_type}><SearchPicker ariaLabel="Degree type" options={DEGREE_OPTS} value={f.degree_type} onChange={(v) => setF({ ...f, degree_type: v })} placeholder="Select degree type" />{!item?.degree_type && item?.degree && <p className="mt-1 text-xs text-muted-foreground">Previously entered: {item.degree}</p>}</Field>
        <Field label="Field Of Study *" error={err.field_of_study}><TextPicker ariaLabel="Field of study" options={fields} value={f.field_of_study} max={100} placeholder="e.g. Computer Science" onChange={(v) => setF({ ...f, field_of_study: v })} addHint="Not listed? Add your major. Shortcuts like CS use the full name." nameFor={fieldName} /></Field>
        <Field label="Institution *" error={err.institution_name}><TextPicker ariaLabel="Institution" options={schools} value={f.institution_name} placeholder="e.g. University Of New Hampshire" onChange={(v) => setF({ ...f, institution_name: v })} addHint="Not listed? Add your school." /></Field>
        <Field label="Graduation Year" error={err.graduation_year}><input inputMode="numeric" maxLength={4} placeholder="2024" className={inputCls} value={f.graduation_year} onChange={(e) => setF({ ...f, graduation_year: e.target.value.replace(/\D/g, "").slice(0, 4) })} /></Field>
      </div>
      <SaveBar saving={saving} onCancel={onCancel} />
    </form>
  );
}
const COMMON_FIELDS = ["Computer Science", "Information Technology", "Information Systems", "Data Science", "Statistics", "Mathematics", "Economics", "Business Administration", "Cybersecurity", "Software Engineering", "Electrical Engineering", "Artificial Intelligence", "Data Analytics"];

/* ---------------- Certifications ---------------- */
export function CertificationManager({ uid, items, adding, setAdding }: { uid: string; items: Cert[]; adding: boolean; setAdding: (v: boolean) => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const refresh = useRefresh(uid);
  return (
    <div className="space-y-4">
      {adding && <CertForm uid={uid} onDone={() => { setAdding(false); refresh(); }} onCancel={() => setAdding(false)} />}
      {!items.length && !adding && <Empty>No certifications yet.</Empty>}
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((x) => editing === x.certification_id ? (
          <div key={x.certification_id} className="sm:col-span-2"><CertForm uid={uid} item={x} onDone={() => { setEditing(null); refresh(); }} onCancel={() => setEditing(null)} /></div>
        ) : (
          <div key={x.certification_id} className="flex items-start justify-between gap-2 rounded-xl border border-border p-4">
            <div>
              <p className="font-semibold">{x.certification_name}</p>
              <p className="text-sm text-muted-foreground">{x.issuing_organization}</p>
              <p className="text-xs text-muted-foreground">{x.issue_date && `Issued ${fmtDate(x.issue_date)}`}{x.expiration_date && ` · Expires ${fmtDate(x.expiration_date)}`}</p>
              {x.certification_number && <p className="text-xs text-muted-foreground">ID {x.certification_number}</p>}
            </div>
            <div className="flex shrink-0">
              <button className={iconBtn} aria-label="Edit certification" onClick={() => setEditing(x.certification_id)}><Pencil className="h-4 w-4" /></button>
              <button className={iconBtn} aria-label="Delete certification" onClick={async () => { if (await confirmDelete("certifications", "certification_id", x.certification_id)) { toast.success("Certification deleted"); refresh(); } }}><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CertForm({ uid, item, onDone, onCancel }: { uid: string; item?: Cert; onDone: () => void; onCancel: () => void }) {
  const [f, setF] = useState({ certification_name: item?.certification_name ?? "", issuing_organization: item?.issuing_organization ?? "", issue_date: item?.issue_date ?? "", expiration_date: item?.expiration_date ?? "", certification_number: item?.certification_number ?? "" });
  const [catalogId, setCatalogId] = useState<string | null>(item?.catalog_id ?? null);
  const [err, setErr] = useState<Partial<Record<keyof typeof f, string>>>({});
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [suggestion, setSuggestion] = useState<{ catalog?: CatalogCert; name: string; issuer: string } | null>(null);
  const suggest = useServerFn(suggestCertification);
  const { data: catalog = [] } = useQuery({
    queryKey: ["certification-catalog"], staleTime: 3600_000,
    queryFn: async () => { const { data, error } = await supabase.from("certification_catalog").select("catalog_id, name, abbreviation, issuer, category, aliases").order("name"); if (error) throw error; return data as CatalogCert[]; },
  });
  const verified = catalogId ? catalog.find((c) => c.catalog_id === catalogId) : undefined;
  const hits = catalogId ? [] : searchCatalog(catalog, f.certification_name);

  function pick(c: CatalogCert) { setCatalogId(c.catalog_id); setF((p) => ({ ...p, certification_name: c.name, issuing_organization: c.issuer })); setOpen(false); setSuggestion(null); }

  async function save(row: typeof f, cid: string | null) {
    setSaving(true);
    const data = { certification_name: row.certification_name.trim(), issuing_organization: row.issuing_organization.trim(), issue_date: row.issue_date || null, expiration_date: row.expiration_date || null, certification_number: row.certification_number.trim(), catalog_id: cid };
    const { error } = item ? await supabase.from("certifications").update(data).eq("certification_id", item.certification_id) : await supabase.from("certifications").insert({ ...data, candidate_id: uid });
    setSaving(false);
    if (error) { toast.error(friendlyError(error, "Profile save failed. Please try again.")); return; }
    toast.success(item ? "Certification updated" : "Certification added"); onDone();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Partial<Record<keyof typeof f, string>> = {};
    if (!f.certification_name.trim()) er.certification_name = "Certification name is required.";
    if (f.issue_date && f.expiration_date && f.expiration_date < f.issue_date) er.expiration_date = "Expiration must be after issue date.";
    setErr(er); if (Object.keys(er).length) return;
    if (catalogId) return save(f, catalogId);
    const exact = exactCatalogMatch(catalog, f.certification_name);
    if (exact) return save({ ...f, certification_name: exact.name, issuing_organization: exact.issuer }, exact.catalog_id);
    setSaving(true);
    const r = await suggest({ data: { name: f.certification_name } }).catch(() => null);
    setSaving(false);
    const cat = r?.catalog_name ? catalog.find((c) => c.name === r.catalog_name) : undefined;
    const name = cat?.name ?? normalizeCertName(r?.name || f.certification_name);
    const issuer = cat?.issuer ?? (r?.issuer ? normalizeCertName(r.issuer) : "");
    const same = !cat && certKey(name) === certKey(f.certification_name) && (!issuer || issuer.toLowerCase() === f.issuing_organization.trim().toLowerCase());
    if (same || r?.failed) return save({ ...f, certification_name: normalizeCertName(f.certification_name) }, null);
    setSuggestion({ ...(cat ? { catalog: cat } : {}), name, issuer });
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-primary/30 bg-primary-soft/30 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Certification Name *" error={err.certification_name}>
          <div className="relative">
            <input className={inputCls} maxLength={150} value={f.certification_name} placeholder="Search, e.g. PMP, AWS, CISSP" role="combobox" aria-expanded={open && hits.length > 0} aria-autocomplete="list"
              onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
              onChange={(e) => { setCatalogId(null); setSuggestion(null); setOpen(true); setF({ ...f, certification_name: e.target.value }); }} />
            {open && hits.length > 0 && (
              <ul role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-border bg-popover p-1 shadow-lg">
                {hits.map((c) => (
                  <li key={c.catalog_id} role="option" aria-selected={false}>
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(c)} className="w-full rounded-lg px-3 py-2 text-left hover:bg-muted">
                      <p className="text-sm font-medium">{catalogLabel(c)}</p>
                      <p className="text-xs text-muted-foreground">{c.issuer}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {verified ? <p className="mt-1 flex items-center gap-1 text-xs text-primary"><BadgeCheck className="h-3.5 w-3.5" /> Verified certification</p>
            : <p className="mt-1 text-xs text-muted-foreground">Pick from the list. Not listed? Type the full official name and we'll check it.</p>}
        </Field>
        <Field label="Issuing Organization"><input className={inputCls} maxLength={150} value={f.issuing_organization} readOnly={!!verified} aria-readonly={!!verified} onChange={(e) => setF({ ...f, issuing_organization: e.target.value })} /></Field>
        <Field label="Issue Date"><DatePicker aria-label="Issue date" value={f.issue_date} max={f.expiration_date || undefined} onChange={(v) => setF({ ...f, issue_date: v })} placeholder="Select issue date" /></Field>
        <Field label="Expiration Date" error={err.expiration_date}><DatePicker aria-label="Expiration date" value={f.expiration_date} min={f.issue_date || undefined} onChange={(v) => setF({ ...f, expiration_date: v })} placeholder="Select expiration date" /></Field>
        <Field label="Certification Number (Optional)"><input className={inputCls} maxLength={100} value={f.certification_number} onChange={(e) => setF({ ...f, certification_number: e.target.value })} /></Field>
      </div>
      {suggestion && (
        <div role="alert" className="rounded-xl border border-primary/40 bg-background p-4">
          <p className="text-sm font-semibold">Did you mean this?</p>
          <p className="mt-1 text-sm">{suggestion.catalog ? catalogLabel(suggestion.catalog) : suggestion.name}</p>
          {suggestion.issuer && <p className="text-xs text-muted-foreground">{suggestion.issuer}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={saving} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              onClick={() => suggestion.catalog ? save({ ...f, certification_name: suggestion.catalog.name, issuing_organization: suggestion.catalog.issuer }, suggestion.catalog.catalog_id) : save({ ...f, certification_name: suggestion.name, issuing_organization: suggestion.issuer || f.issuing_organization }, null)}>Use this</button>
            <button type="button" disabled={saving} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted" onClick={() => save({ ...f, certification_name: normalizeCertName(f.certification_name) }, null)}>Keep what I typed</button>
          </div>
        </div>
      )}
      <SaveBar saving={saving} onCancel={onCancel} />
    </form>
  );
}

/* ---------------- Lookup (languages / skills / technologies) ---------------- */
export type LookupRow = { lookup_id: string; name: string; proficiency_level: Proficiency; years_experience: number };
type LookupTable = "candidate_languages" | "candidate_skills" | "candidate_technologies";

export function LookupManager({ uid, table, options, otherOptions = [], rows, noun, required, successMsg, adding, setAdding, roleName }: {
  roleName?: string | null | undefined; uid: string; table: LookupTable; options: { id: string; name: string; group?: string | undefined }[]; otherOptions?: { id: string; name: string }[]; rows: LookupRow[]; noun: string; required?: boolean; successMsg: string;
  adding: boolean; setAdding: (v: boolean) => void;
}) {
  const refresh = useRefresh(uid);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const plural = noun === "technology" ? "technologies" : noun + "s";
  const chosen = new Set(rows.map((r) => r.lookup_id));
  const matches = options.filter((o) => !chosen.has(o.id) && optionMatches(o, q));

  async function run(p: PromiseLike<{ error: unknown }>, ok: string) {
    setBusy(true);
    const { error } = await p;
    setBusy(false);
    if (error) { toast.error(friendlyError(error, "Profile save failed. Please try again.")); return false; }
    toast.success(ok); refresh(); return true;
  }
  const close = () => { setPicked([]); setQ(""); setAdding(false); };
  const kind: TaxonomyKind = table === "candidate_languages" ? "language" : table === "candidate_skills" ? "skill" : "technology";
  const guarded = kind === "skill" || kind === "technology";
  const newName = canAddTaxonomy(kind) && !guarded ? newEntryName(q, options) : null;
  const createNew = async () => {
    if (!newName) return;
    setBusy(true);
    try {
      const id = await addTaxonomyEntry(kind, q);
      setPicked((p) => (p.includes(id) ? p : [...p, id])); setQ("");
      toast.success(`"${newName}" added to the list`);
      refresh();
    } catch (e) { toast.error(friendlyError(e, "Couldn't add. Please try again.")); }
    setBusy(false);
  };
  const guardAdd = async (target: "skill" | "technology", id: string, name: string) => {
    if (target === kind) { setPicked((p) => (p.includes(id) ? p : [...p, id])); setQ(""); toast.success(`"${name}" ready to add`); refresh(); return; }
    const otherTable = target === "skill" ? "candidate_skills" : "candidate_technologies";
    const { error } = await supabase.from(otherTable).insert({ candidate_id: uid, lookup_id: id });
    if (error && (error as { code?: string }).code !== "23505") throw new Error(friendlyError(error, "Couldn't add. Please try again."));
    setQ(""); toast.success(`"${name}" added to ${KIND_LABEL[target]}`); refresh();
  };
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const addSelected = async () => {
    if (!picked.length) return;
    if (await run(supabase.from(table).insert(picked.map((id) => ({ candidate_id: uid, lookup_id: id }))), successMsg)) close();
  };
  const update = (id: string, patch: { proficiency_level?: Proficiency; years_experience?: number }) =>
    run(supabase.from(table).update(patch).eq("candidate_id", uid).eq("lookup_id", id), successMsg);
  const remove = (id: string) => {
    if (required && rows.length <= 1) { toast.error(`At least one ${noun} is required.`); return; }
    run(supabase.from(table).delete().eq("candidate_id", uid).eq("lookup_id", id), successMsg);
  };

  return (
    <div className="space-y-4">
      {adding && (
        <div className="space-y-4 rounded-2xl border border-primary/30 bg-primary-soft/30 p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input autoFocus className={`${inputCls} pl-9`} placeholder={`${canAddTaxonomy(kind) ? "Search or add" : "Search"} ${plural}…`} value={q} onChange={(e) => setQ(e.target.value)} disabled={busy}
              onKeyDown={(e) => { if (e.key === "Enter" && newName) { e.preventDefault(); createNew(); } }} />
          </div>
          <p className="text-xs text-muted-foreground">Select as many {plural} as you like. {picked.length > 0 && <span className="font-semibold text-primary">{picked.length} selected</span>}</p>
          {matches.length > 0 ? (
            <div className="max-h-72 overflow-y-auto"><RecGroups items={matches} roleName={roleName} kind={kind} query={q} className="flex flex-wrap gap-1.5" render={(o) => {
              const on = picked.includes(o.id);
              return (
                <button key={o.id} type="button" aria-pressed={on} onClick={() => toggle(o.id)} disabled={busy}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary hover:text-primary"}`}>
                  {on ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}{o.name}{o.group && <span className={on ? "opacity-80" : "text-muted-foreground"}>· {o.group}</span>}
                </button>
              );
            }} /></div>
          ) : !newName && !guarded && <p className="text-xs text-muted-foreground">No matching results.</p>}
          {newName && (
            <button type="button" onClick={createNew} disabled={busy} className="inline-flex items-center gap-1 rounded-full border border-dashed border-primary px-3 py-1 text-xs font-semibold text-primary hover:bg-primary-soft">
              <Plus className="h-3 w-3" />Add “{newName}”
            </button>
          )}
          {guarded && <CategoryGuardAdd q={q} kind={kind} options={options} otherOptions={otherOptions} onAdd={guardAdd} disabled={busy} />}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={close} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">Cancel</button>
            <button type="button" onClick={addSelected} disabled={busy || !picked.length} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {busy ? "Saving…" : `Add Selected${picked.length ? ` (${picked.length})` : ""}`}
            </button>
          </div>
        </div>
      )}
      {!rows.length && !adding && <Empty>No {plural} added yet. Click “Add” to pick one or more.</Empty>}
      {required && rows.length === 0 && <p className="text-xs font-medium text-destructive">At least one {noun} is required.</p>}
      {rows.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {rows.map((r) => (
            <li key={r.lookup_id} className="flex flex-wrap items-center gap-3 p-3">
              <span className="min-w-[8rem] flex-1 text-sm font-semibold">{r.name}</span>
              <select aria-label={`${r.name} proficiency`} className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm" value={r.proficiency_level}
                onChange={(e) => update(r.lookup_id, { proficiency_level: e.target.value as Proficiency })}>
                {PROFICIENCY.map((p) => <option key={p} value={p}>{cap(p)}</option>)}
              </select>
              <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <input type="number" min={0} max={50} aria-label={`${r.name} years`} defaultValue={r.years_experience} className="w-16 rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-foreground"
                  onBlur={(e) => { const y = Math.max(0, Math.min(50, Math.round(Number(e.target.value) || 0))); if (y !== r.years_experience) update(r.lookup_id, { years_experience: y }); }} /> yrs
              </label>
              <button className={iconBtn} aria-label={`Remove ${r.name}`} onClick={() => remove(r.lookup_id)} disabled={busy}><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Soft skills: searchable multi-select shown as badges. Display/search only — never used in scoring. */
export function SoftSkillManager({ uid, options = [], selected = [], adding, setAdding, roleName }: { roleName?: string | null | undefined; uid: string; options: { id: string; name: string }[]; selected: string[]; adding: boolean; setAdding: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const name = (id: string) => options.find((o) => o.id === id)?.name ?? "";
  const refresh = () => qc.invalidateQueries({ queryKey: ["candidate-full", uid] });
  const available = options.filter((o) => !selected.includes(o.id) && o.name.toLowerCase().includes(q.toLowerCase()));
  const close = () => { setPicked([]); setQ(""); setAdding(false); };
  const newName = newEntryName(q, options);
  const createNew = async () => {
    if (!newName) return;
    setBusy(true);
    try {
      const id = await addTaxonomyEntry("soft_skill", q);
      setPicked((p) => (p.includes(id) ? p : [...p, id])); setQ("");
      toast.success(`"${newName}" added to the list`);
      refresh();
    } catch (e) { toast.error(friendlyError(e, "Couldn't add. Please try again.")); }
    setBusy(false);
  };
  const save = async () => {
    if (!picked.length) { close(); return; }
    setBusy(true);
    const { error } = await supabase.from("candidate_soft_skills").insert(picked.map((id) => ({ candidate_id: uid, lookup_id: id })));
    setBusy(false);
    if (error) { toast.error(friendlyError(error, "Couldn't add soft skills.")); return; }
    toast.success("Soft skills updated"); close(); void refresh();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("candidate_soft_skills").delete().eq("candidate_id", uid).eq("lookup_id", id);
    if (error) { toast.error(friendlyError(error, "Couldn't remove soft skill.")); return; }
    toast.success("Soft skill removed"); void refresh();
  };
  return (
    <div className="space-y-4">
      {adding && (
        <div className="space-y-3 rounded-xl border border-border p-4">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input autoFocus className={`${inputCls} pl-9`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search or add soft skills (Communication, Leadership…)"
              onKeyDown={(e) => { if (e.key === "Enter" && newName) { e.preventDefault(); createNew(); } }} /></div>
          <div className="flex flex-wrap gap-1.5">
            {available.length ? <RecGroups items={available} roleName={roleName} kind="soft_skill" query={q} className="flex flex-wrap gap-1.5" render={(o) => {
              const on = picked.includes(o.id);
              return <button type="button" key={o.id} aria-pressed={on} onClick={() => setPicked(on ? picked.filter((x) => x !== o.id) : [...picked, o.id])}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${on ? "border-indigo bg-indigo/10 text-indigo" : "border-border hover:border-indigo hover:text-indigo"}`}>{on ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}{o.name}</button>;
            }} /> : !newName && <span className="text-sm text-muted-foreground">No more soft skills to add.</span>}
            {newName && <button type="button" onClick={createNew} disabled={busy} className="inline-flex items-center gap-1 rounded-full border border-dashed border-indigo px-3 py-1 text-xs font-semibold text-indigo hover:bg-indigo/10"><Plus className="h-3 w-3" />Add “{newName}”</button>}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={close} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">Cancel</button>
            <button type="button" disabled={busy || !picked.length} onClick={save} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">{busy ? "Saving…" : `Add Selected${picked.length ? ` (${picked.length})` : ""}`}</button>
          </div>
        </div>
      )}
      {selected.length ? (
        <div className="flex flex-wrap gap-2">{[...selected].sort((a, b) => name(a).localeCompare(name(b))).map((id) => (
          <span key={id} className="inline-flex items-center gap-1.5 rounded-full border border-indigo/20 bg-indigo/10 px-3 py-1 text-sm font-medium text-indigo">{name(id)}
            <button type="button" aria-label={`Remove ${name(id)}`} onClick={() => remove(id)} className="rounded-full p-0.5 hover:bg-indigo/20"><Trash2 className="h-3.5 w-3.5" /></button></span>
        ))}</div>
      ) : !adding && <Empty>No soft skills added yet.</Empty>}
    </div>
  );
}
