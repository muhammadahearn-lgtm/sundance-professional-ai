import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, EyeOff, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { validateImageFile } from "@/lib/recruiter-completion";
import { CONFIDENTIAL_DEFAULT } from "@/lib/confidential";
import { BrandImg, COMPANY_SIZES, INDUSTRIES } from "@/components/recruiter/shared";
import { Field, friendlyError, inputCls } from "@/components/profile/parts";

type Info = { website: string; industry: string; company_size: string; description: string };

/** "Edit Client Info" accordion + Confidential Search toggle for the selected job company. */
export function ClientCompanyPanel({ uid, companyId, confidential, label, onConfidential, onLabel }: {
  uid: string; companyId: string; confidential: boolean; label: string;
  onConfidential: (v: boolean) => void; onLabel: (v: string) => void;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const q = useQuery({
    queryKey: ["job-client-company", companyId], enabled: !!companyId,
    queryFn: async () => {
      const [c, m] = await Promise.all([
        supabase.from("companies").select("company_id, company_name, website, industry, company_size, description, logo_url, created_by").eq("company_id", companyId).maybeSingle(),
        supabase.rpc("is_company_admin", { _company: companyId, _uid: uid }),
      ]);
      if (c.error) throw c.error;
      return { c: c.data, admin: !!m.data };
    },
  });
  const c = q.data?.c;
  const [v, setV] = useState<Info>({ website: "", industry: "", company_size: "", description: "" });
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (c) setV({ website: c.website, industry: c.industry, company_size: c.company_size, description: c.description }); }, [c]);
  const canEdit = !!c && (q.data!.admin || c.created_by === uid);

  const save = async (patch: Partial<Info> & { logo_url?: string }, msg: string) => {
    setSaving(true);
    const { data, error } = await supabase.from("companies").update(patch).eq("company_id", companyId).select("company_id");
    setSaving(false);
    if (error || !data?.length) { toast.error(friendlyError(error, "Only the person who manages this company can edit its details.")); return; }
    toast.success(msg); void qc.invalidateQueries({ queryKey: ["job-client-company", companyId] });
  };
  const upload = async (file: File) => {
    const bad = validateImageFile(file); if (bad) { toast.error(bad); return; }
    const path = `${uid}/logo-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from("company-branding").upload(path, file, { contentType: file.type });
    if (error) { toast.error("Failed to upload logo."); return; }
    await save({ logo_url: path }, "Logo uploaded");
  };

  if (!companyId) return null;
  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="rounded-xl border border-border">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold">
          <span>Client Info{c ? ` — ${c.company_name}` : ""} <span className="font-normal text-muted-foreground">(optional, shown to candidates)</span></span>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && c && (
          <div className="space-y-4 border-t border-border p-4">
            {!canEdit && <p className="text-xs text-muted-foreground">This company is managed by its own team, so its details are read-only here.</p>}
            <div className="flex items-center gap-3">
              {c.logo_url ? <BrandImg path={c.logo_url} alt="Client logo" className="h-12 w-12 rounded-lg object-cover" /> : <div className="grid h-12 w-12 place-items-center rounded-lg bg-muted text-xs text-muted-foreground">Logo</div>}
              {canEdit && <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold hover:border-primary hover:text-primary"><Upload className="h-4 w-4" />Upload logo<input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} /></label>}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Website"><input disabled={!canEdit} className={inputCls} value={v.website} onChange={(e) => setV({ ...v, website: e.target.value })} placeholder="apexrobotics.com" /></Field>
              <Field label="Industry"><input disabled={!canEdit} list="client-industries" className={inputCls} value={v.industry} onChange={(e) => setV({ ...v, industry: e.target.value })} placeholder="Technology" /><datalist id="client-industries">{INDUSTRIES.map((i) => <option key={i} value={i} />)}</datalist></Field>
              <Field label="Company Size"><select disabled={!canEdit} className={inputCls} value={v.company_size} onChange={(e) => setV({ ...v, company_size: e.target.value })}><option value="">Select</option>{COMPANY_SIZES.map((s) => <option key={s} value={s}>{s} employees</option>)}</select></Field>
            </div>
            <Field label="About the Company"><textarea disabled={!canEdit} rows={3} maxLength={2000} className={inputCls} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} placeholder="Series A AI infrastructure startup building next-gen inference engines." /></Field>
            {canEdit && <div className="flex justify-end"><button type="button" disabled={saving} onClick={() => void save({ website: v.website.trim(), industry: v.industry.trim(), company_size: v.company_size, description: v.description.trim() }, "Client info saved")} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{saving ? "Saving…" : "Save Client Info"}</button></div>}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-primary" checked={confidential} onChange={(e) => onConfidential(e.target.checked)} />
          <span><span className="flex items-center gap-1.5 text-sm font-semibold"><EyeOff className="h-4 w-4" />Confidential Search</span>
            <span className="block text-xs text-muted-foreground">Candidates see a label instead of the company name, logo and website. You still see the real company.</span></span>
        </label>
        {confidential && (
          <div className="mt-3"><Field label="Label Shown to Candidates" hint={<span className="text-xs text-muted-foreground">{label.length}/80</span>}>
            <input className={inputCls} maxLength={80} value={label} onChange={(e) => onLabel(e.target.value)} placeholder={`${CONFIDENTIAL_DEFAULT} (e.g. Fast-growing Series B FinTech)`} />
          </Field></div>
        )}
      </div>
    </div>
  );
}
