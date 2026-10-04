import { useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Briefcase, Building2, Eye, Globe, ImagePlus, Mail, Pencil, Sparkles, Trash2, Upload, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Account } from "@/lib/account";
import { COMPANY_DESCRIPTION_MAX, validateCompany, validateImageFile } from "@/lib/recruiter-completion";
import { Chips, Empty, Field, SaveBar, Section, TagInput, card, friendlyError, inputCls } from "@/components/profile/parts";
import { BrandImg, COMPANY_SIZES, CompletionCard, HIRING_VOLUMES, Item, MultiToggle, ORG_TYPES, REGIONS, WORK_ARRANGEMENTS, initials, orgKey } from "./shared";
import type { Database } from "@/integrations/supabase/types";

type OrgType = Database["public"]["Enums"]["organization_type"];

async function load(uid: string) {
  const prof = await supabase.from("recruiter_profiles").select("company_id, company_name, company_website, industry, company_description, organization_type").eq("user_id", uid).maybeSingle();
  if (prof.error) throw prof.error;
  const cid = prof.data?.company_id;
  if (!cid) return { r: prof.data, company: null, recruiters: [], roleNames: [] as string[] };
  const [c, rec, roles] = await Promise.all([
    supabase.from("companies").select("*").eq("company_id", cid).maybeSingle(),
    supabase.rpc("company_recruiters", { _company: cid }),
    supabase.from("roles").select("role_name").order("role_name"),
  ]);
  const err = [c, rec, roles].find((x) => x.error)?.error;
  if (err) throw err;
  return { r: prof.data, company: c.data, recruiters: rec.data ?? [], roleNames: (roles.data ?? []).map((x) => x.role_name) };
}
type Data = Awaited<ReturnType<typeof load>>;
type Company = NonNullable<Data["company"]>;
type CUpdate = Database["public"]["Tables"]["companies"]["Update"];

export function CompanyProfilePage({ account }: { account: Account }) {
  const uid = account.userId;
  const qc = useQueryClient();
  const key = ["company-full", uid];
  const { data, isLoading, error, refetch } = useQuery({ queryKey: key, queryFn: () => load(uid) });
  const [edit, setEdit] = useState<"info" | "why" | "hiring" | null>(null);
  const [preview, setPreview] = useState(false);
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: key }), qc.invalidateQueries({ queryKey: ["recruiter-full", uid] })]);

  if (isLoading) return <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className={`${card} h-40 animate-pulse`} />)}</div>;
  if (error || !data) return (
    <div className={`${card} p-8 text-center`}>
      <p className="font-semibold">{friendlyError(error, "We couldn't load your company.")}</p>
      <button onClick={() => refetch()} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Try again</button>
    </div>
  );
  if (!data.r) return <div className={`${card} p-8 text-center`}>Your profile hasn't been set up yet. Please finish onboarding.</div>;

  if (!data.company) return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className={`${card} p-6`}>
        <h1 className="font-display text-2xl font-extrabold">Set up your company profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create your employer profile so candidates can learn about who you hire for.</p>
      </div>
      <div className={`${card} p-6`}>
        <InfoForm uid={uid} initial={{
          company_name: data.r.company_name, website: data.r.company_website, industry: data.r.industry, description: data.r.company_description,
          company_size: "", organization_type: orgKey(data.r.organization_type), headquarters: "", contact_email: account.email,
        }} onDone={async (ok) => { if (ok) await refresh(); }} submitLabel="Create Company" />
      </div>
    </div>
  );

  const c = data.company;
  const canEdit = c.created_by === uid;
  const save = async (patch: CUpdate, ok: string) => {
    const { error: e } = await supabase.from("companies").update(patch).eq("company_id", c.company_id);
    if (e) { toast.error(friendlyError(e, "Failed to save company.")); return false; }
    toast.success(ok);
    await refresh();
    return true;
  };

  if (preview || !canEdit) return <PublicView c={c} recruiters={data.recruiters} onBack={canEdit ? () => setPreview(false) : undefined} />;

  const uploadBrand = async (file: File, kind: "logo" | "banner") => {
    const bad = validateImageFile(file);
    if (bad) { toast.error(bad); return; }
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${uid}/${kind}-${Date.now()}-${safe}`;
    const { error: e } = await supabase.storage.from("company-branding").upload(path, file, { contentType: file.type });
    if (e) { toast.error("Failed to upload image."); return; }
    await save(kind === "logo" ? { logo_url: path } : { banner_url: path }, kind === "logo" ? "Logo uploaded" : "Banner uploaded");
  };

  const filled = [c.company_name, c.industry, c.organization_type, c.description, c.company_size, c.website, c.logo_url ?? "", c.why_work_here].filter((x) => String(x).trim()).length;
  const percent = Math.round((filled / 8) * 100);
  const suggestions = [
    !c.logo_url && "Upload your company logo.", !c.description.trim() && "Add a company description.", !c.why_work_here.trim() && "Tell candidates why they should work here.",
    !c.company_size && "Add your company size.", !c.website && "Add your website.",
  ].filter((x): x is string => !!x);
  const editBtn = (k: NonNullable<typeof edit>) => edit !== k && (
    <button onClick={() => setEdit(k)} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold hover:border-primary hover:text-primary"><Pencil className="h-4 w-4" /><span className="hidden sm:inline">Edit</span></button>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-6">
        <Header c={c} onUploadLogo={(f) => uploadBrand(f, "logo")} onUploadBanner={(f) => uploadBrand(f, "banner")}>
          <button onClick={() => { setEdit("info"); document.getElementById("company-info")?.scrollIntoView({ behavior: "smooth" }); }} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"><Pencil className="h-4 w-4" />Edit Company</button>
          <button onClick={() => setPreview(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary"><Eye className="h-4 w-4" />Preview Company</button>
        </Header>

        <Section id="company-info" title="Company Information" icon={<Building2 className="h-4 w-4" />} action={editBtn("info")}>
          {edit === "info" ? (
            <InfoForm uid={uid} companyId={c.company_id} initial={{ company_name: c.company_name, website: c.website, industry: c.industry, description: c.description, company_size: c.company_size, organization_type: c.organization_type, headquarters: c.headquarters, contact_email: c.contact_email }}
              onDone={async (ok) => { if (ok) await refresh(); setEdit(null); }} />
          ) : (
            <div className="space-y-5">
              <dl className="grid gap-5 sm:grid-cols-3">
                <Item k="Industry" v={c.industry} /><Item k="Company Size" v={c.company_size && `${c.company_size} employees`} /><Item k="Organization Type" v={ORG_TYPES.find(([k]) => k === c.organization_type)?.[1]} />
                <Item k="Website" v={c.website} /><Item k="Headquarters" v={c.headquarters} /><Item k="Contact Email" v={c.contact_email} />
              </dl>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Overview</dt><p className="mt-1 whitespace-pre-line text-sm">{c.description || "—"}</p></div>
            </div>
          )}
        </Section>

        <Section title="Employer Branding" icon={<ImagePlus className="h-4 w-4" />}>
          <Branding uid={uid} c={c} save={save} />
        </Section>

        <Section title="Why Work Here" icon={<Sparkles className="h-4 w-4" />} action={editBtn("why")}>
          {edit === "why" ? <WhyForm value={c.why_work_here} onCancel={() => setEdit(null)} onSave={async (v) => { if (await save({ why_work_here: v }, "Employer branding updated")) setEdit(null); }} />
            : <p className="whitespace-pre-line text-sm">{c.why_work_here || <span className="text-muted-foreground">Share benefits, career growth, culture, mission, learning opportunities and remote flexibility.</span>}</p>}
        </Section>

        <Section title="Hiring Information" icon={<Briefcase className="h-4 w-4" />} action={editBtn("hiring")}>
          {edit === "hiring" ? <HiringForm c={c} roleNames={data.roleNames} onCancel={() => setEdit(null)} onSave={async (v) => { if (await save(v, "Company profile updated")) setEdit(null); }} /> : (
            <dl className="grid gap-5 sm:grid-cols-2">
              <Item k="Primary Hiring Regions" v={<Chips items={c.hiring_regions} />} /><Item k="Preferred Work Arrangements" v={<Chips items={c.preferred_work_arrangements} />} />
              <Item k="Primary Technical Roles" v={<Chips items={c.primary_technical_roles} />} /><Item k="Hiring Volume" v={c.hiring_volume} />
            </dl>
          )}
        </Section>

        <Section title="Recruiter Directory" icon={<Users className="h-4 w-4" />}>
          <Directory recruiters={data.recruiters} />
        </Section>
      </div>
      <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
        <CompletionCard title="Company Profile" percent={percent} suggestions={suggestions} />
      </aside>
    </div>
  );
}

function HeaderUpload({ onFile, label, className }: { onFile: (f: File) => void; label: string; className: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
        onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; setBusy(true); await onFile(f); setBusy(false); }} />
      <button type="button" disabled={busy} onClick={() => ref.current?.click()} aria-label={label} title={label}
        className={`absolute grid h-8 w-8 place-items-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow hover:opacity-90 disabled:opacity-60 ${className}`}>
        <Camera className="h-4 w-4" />
      </button>
    </>
  );
}

function Header({ c, children, onUploadLogo, onUploadBanner }: { c: Company; children?: React.ReactNode; onUploadLogo?: ((f: File) => Promise<void>) | undefined; onUploadBanner?: ((f: File) => Promise<void>) | undefined }) {
  return (
    <div className={`${card} overflow-hidden`}>
      <div className="relative">
        {c.banner_url ? <BrandImg path={c.banner_url} alt="Company banner" className="h-32 w-full object-cover sm:h-44" /> : <div className="h-32 bg-gradient-primary sm:h-44" />}
        {onUploadBanner && <HeaderUpload onFile={onUploadBanner} label={c.banner_url ? "Change banner" : "Upload banner"} className="right-3 top-3" />}
      </div>
      <div className="p-6 pt-0">
        <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="relative shrink-0 self-start">
            {c.logo_url ? <BrandImg path={c.logo_url} alt="Company logo" className="h-20 w-20 rounded-2xl border-4 border-card bg-card object-cover" /> : <div className="grid h-20 w-20 place-items-center rounded-2xl border-4 border-card bg-muted"><Building2 className="h-8 w-8 text-muted-foreground" /></div>}
            {onUploadLogo && <HeaderUpload onFile={onUploadLogo} label={c.logo_url ? "Change logo" : "Upload logo"} className="-bottom-1 -right-1" />}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-extrabold">{c.company_name}</h1>
            <p className="text-sm text-muted-foreground">{[c.industry, c.company_size && `${c.company_size} employees`, ORG_TYPES.find(([k]) => k === c.organization_type)?.[1]].filter(Boolean).join(" · ")}</p>
            {c.website && <a href={/^https?:\/\//.test(c.website) ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"><Globe className="h-4 w-4" />{c.website.replace(/^https?:\/\//, "")}</a>}
          </div>
        </div>
        {children && <div className="mt-5 flex flex-wrap gap-2">{children}</div>}
      </div>
    </div>
  );
}

type InfoValues = { company_name: string; website: string; industry: string; description: string; company_size: string; organization_type: string; headquarters: string; contact_email: string };

function InfoForm({ uid, companyId, initial, onDone, submitLabel }: { uid: string; companyId?: string; initial: InfoValues; onDone: (ok: boolean) => void; submitLabel?: string }) {
  const [f, setF] = useState(initial);
  const [errs, setErrs] = useState<ReturnType<typeof validateCompany>>({});
  const [saving, setSaving] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validateCompany(f);
    setErrs(v);
    if (Object.keys(v).length) { toast.error("Missing required fields."); return; }
    setSaving(true);
    const row = { company_name: f.company_name.trim(), website: f.website.trim(), industry: f.industry.trim(), description: f.description, company_size: f.company_size, organization_type: f.organization_type as OrgType, headquarters: f.headquarters.trim(), contact_email: f.contact_email.trim() };
    let err;
    if (companyId) {
      err = (await supabase.from("companies").update(row).eq("company_id", companyId)).error;
    } else {
      const ins = await supabase.from("companies").insert({ ...row, created_by: uid }).select("company_id").single();
      err = ins.error ?? (await supabase.from("recruiter_profiles").update({ company_id: ins.data!.company_id, company_name: row.company_name }).eq("user_id", uid)).error;
    }
    setSaving(false);
    if (err) { toast.error(friendlyError(err, "Failed to save company.")); return; }
    toast.success("Company profile updated");
    onDone(true);
  };
  const inp = (k: keyof InfoValues, l: string, ph?: string) => (
    <Field label={l} error={errs[k as keyof typeof errs]}><input className={inputCls} placeholder={ph} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></Field>
  );
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {inp("company_name", "Company Name *")}{inp("website", "Website", "acme.com")}
        {inp("industry", "Industry *", "Technology")}
        <Field label="Organization Type *" error={errs.organization_type}>
          <select className={inputCls} value={f.organization_type} onChange={(e) => setF({ ...f, organization_type: e.target.value })}>
            <option value="">Select…</option>{ORG_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <Field label="Company Size">
          <select className={inputCls} value={f.company_size} onChange={(e) => setF({ ...f, company_size: e.target.value })}>
            <option value="">Select…</option>{COMPANY_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        {inp("headquarters", "Headquarters", "Boston, MA")}
        {inp("contact_email", "Contact Email", "careers@acme.com")}
      </div>
      <Field label="Description *" error={errs.description} hint={<span className={`text-xs ${f.description.length > COMPANY_DESCRIPTION_MAX ? "text-destructive" : "text-muted-foreground"}`}>{f.description.length}/{COMPANY_DESCRIPTION_MAX}</span>}>
        <textarea rows={8} className={inputCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Mission, culture, business overview, technology focus, hiring philosophy…" />
      </Field>
      <SaveBar saving={saving} onCancel={() => { setF(initial); onDone(false); }} label={submitLabel ?? "Save Changes"} />
    </form>
  );
}

function WhyForm({ value, onSave, onCancel }: { value: string; onSave: (v: string) => Promise<void>; onCancel: () => void }) {
  const [v, setV] = useState(value);
  const [saving, setSaving] = useState(false);
  return (
    <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); if (v.length > COMPANY_DESCRIPTION_MAX) { toast.error(`Keep it under ${COMPANY_DESCRIPTION_MAX} characters.`); return; } setSaving(true); await onSave(v); setSaving(false); }}>
      <Field label="Why Work Here" hint={<span className="text-xs text-muted-foreground">{v.length}/{COMPANY_DESCRIPTION_MAX}</span>}>
        <textarea rows={6} className={inputCls} value={v} onChange={(e) => setV(e.target.value)} placeholder="Benefits, career growth, culture, mission, learning opportunities, remote flexibility…" />
      </Field>
      <SaveBar saving={saving} onCancel={onCancel} />
    </form>
  );
}

function HiringForm({ c, roleNames, onSave, onCancel }: { c: Company; roleNames: string[]; onSave: (v: CUpdate) => Promise<void>; onCancel: () => void }) {
  const [v, setV] = useState({ hiring_regions: c.hiring_regions, preferred_work_arrangements: c.preferred_work_arrangements, primary_technical_roles: c.primary_technical_roles, hiring_volume: c.hiring_volume });
  const [saving, setSaving] = useState(false);
  return (
    <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSave(v); setSaving(false); }}>
      <div className="space-y-1.5"><span className="text-sm font-medium">Primary Hiring Regions</span><MultiToggle options={REGIONS} value={v.hiring_regions} onChange={(x) => setV({ ...v, hiring_regions: x })} /></div>
      <div className="space-y-1.5"><span className="text-sm font-medium">Preferred Work Arrangements</span><MultiToggle options={WORK_ARRANGEMENTS} value={v.preferred_work_arrangements} onChange={(x) => setV({ ...v, preferred_work_arrangements: x })} /></div>
      <Field label="Primary Technical Roles"><TagInput value={v.primary_technical_roles} onChange={(x) => setV({ ...v, primary_technical_roles: x })} options={roleNames} placeholder="Type to add a role…" /></Field>
      <Field label="Hiring Volume">
        <select className={inputCls} value={v.hiring_volume} onChange={(e) => setV({ ...v, hiring_volume: e.target.value })}>
          <option value="">Select…</option>{HIRING_VOLUMES.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
      </Field>
      <SaveBar saving={saving} onCancel={onCancel} />
    </form>
  );
}

function Branding({ uid, c, save }: { uid: string; c: Company; save: (p: CUpdate, ok: string) => Promise<boolean> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const upload = async (file: File, kind: "logo" | "banner" | "gallery") => {
    const bad = validateImageFile(file);
    if (bad) { toast.error(bad); return; }
    setBusy(kind);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${uid}/${kind}-${Date.now()}-${safe}`;
    const { error } = await supabase.storage.from("company-branding").upload(path, file, { contentType: file.type });
    if (error) { setBusy(null); toast.error(kind === "logo" ? "Failed to upload logo." : "Failed to upload image."); return; }
    if (kind === "logo") await save({ logo_url: path }, "Logo uploaded");
    else if (kind === "banner") await save({ banner_url: path }, "Banner uploaded");
    else await save({ gallery_urls: [...c.gallery_urls, path].slice(-12) }, "Employer branding updated");
    setBusy(null);
  };
  const removeGallery = (p: string) => save({ gallery_urls: c.gallery_urls.filter((x) => x !== p) }, "Image removed");
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Uploader label="Company Logo" busy={busy === "logo"} onFile={(f) => upload(f, "logo")}>
          {c.logo_url ? <BrandImg path={c.logo_url} alt="Logo" className="h-16 w-16 rounded-xl object-cover" /> : <Building2 className="h-8 w-8 text-muted-foreground" />}
        </Uploader>
        <Uploader label="Company Banner" busy={busy === "banner"} onFile={(f) => upload(f, "banner")}>
          {c.banner_url ? <BrandImg path={c.banner_url} alt="Banner" className="h-16 w-32 rounded-xl object-cover" /> : <ImagePlus className="h-8 w-8 text-muted-foreground" />}
        </Uploader>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between"><span className="text-sm font-medium">Office & Workplace Images</span><Picker busy={busy === "gallery"} onFile={(f) => upload(f, "gallery")} text="Add Image" /></div>
        {c.gallery_urls.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{c.gallery_urls.map((p) => (
            <div key={p} className="group relative"><BrandImg path={p} alt="Workplace" className="aspect-video w-full rounded-xl object-cover" />
              <button onClick={() => removeGallery(p)} aria-label="Remove image" className="absolute right-2 top-2 rounded-lg bg-card/90 p-1.5 text-destructive opacity-100 sm:opacity-0 sm:group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button></div>
          ))}</div>
        ) : <Empty>Show candidates your office and team. PNG, JPG or WEBP up to 5 MB.</Empty>}
      </div>
    </div>
  );
}

function Uploader({ label, busy, onFile, children }: { label: string; busy: boolean; onFile: (f: File) => void; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-dashed border-border p-4">
      <div className="grid h-16 min-w-16 place-items-center rounded-xl bg-muted/50">{children}</div>
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{label}</p><p className="text-xs text-muted-foreground">PNG, JPG, WEBP · 5 MB</p></div>
      <Picker busy={busy} onFile={onFile} text="Upload" />
    </div>
  );
}

function Picker({ busy, onFile, text }: { busy: boolean; onFile: (f: File) => void; text: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      <button type="button" disabled={busy} onClick={() => ref.current?.click()} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold hover:border-primary hover:text-primary disabled:opacity-60"><Upload className="h-4 w-4" />{busy ? "Uploading…" : text}</button>
    </>
  );
}

function Directory({ recruiters }: { recruiters: Data["recruiters"] }) {
  if (!recruiters.length) return <Empty>No recruiters connected yet.</Empty>;
  return (
    <div className="grid gap-3 sm:grid-cols-2">{recruiters.map((r) => (
      <div key={r.user_id} className="flex items-center gap-3 rounded-2xl border border-border p-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft font-display font-bold text-primary">{initials(r.first_name, r.last_name)}</div>
        <div className="min-w-0"><p className="truncate font-semibold">{r.first_name} {r.last_name}</p><p className="truncate text-sm">{r.title}</p><p className="truncate text-xs text-muted-foreground">{[r.specialization, r.location].filter(Boolean).join(" · ")}</p></div>
      </div>
    ))}</div>
  );
}

function PublicView({ c, recruiters, onBack }: { c: Company; recruiters: Data["recruiters"]; onBack?: (() => void) | undefined }) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {onBack ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary-soft px-4 py-3 text-sm">
          <span className="font-semibold text-primary">Preview — this is how candidates see your company</span>
          <button onClick={onBack} className="inline-flex items-center gap-1.5 rounded-xl bg-card px-3 py-1.5 font-semibold hover:text-primary"><ArrowLeft className="h-4 w-4" />Back to editing</button>
        </div>
      ) : <p className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">Only the recruiter who created this company can edit it.</p>}
      <Header c={c} />
      <div className={`${card} p-6`}><h2 className="font-display text-lg font-bold">About {c.company_name}</h2><p className="mt-3 whitespace-pre-line text-sm">{c.description || "—"}</p>
        {c.contact_email && <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Mail className="h-4 w-4" />{c.contact_email}</p>}</div>
      {c.why_work_here && <div className={`${card} p-6`}><h2 className="font-display text-lg font-bold">Culture & Why Work Here</h2><p className="mt-3 whitespace-pre-line text-sm">{c.why_work_here}</p></div>}
      {c.gallery_urls.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{c.gallery_urls.map((p) => <BrandImg key={p} path={p} alt="Workplace" className="aspect-video w-full rounded-xl object-cover" />)}</div>}
      <div className={`${card} p-6`}><h2 className="font-display text-lg font-bold">Open Positions</h2><div className="mt-3"><Empty>Open positions will appear here once jobs are posted.</Empty></div></div>
      <div className={`${card} p-6`}><h2 className="mb-4 font-display text-lg font-bold">Recruiters</h2><Directory recruiters={recruiters} /></div>
    </div>
  );
}
