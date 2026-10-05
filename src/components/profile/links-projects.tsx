import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Github, Globe, Linkedin, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeUrl, validateLinks, type LinkKey } from "@/lib/profile-links";
import { Field, SaveBar, TagInput, inputCls } from "./parts";

export type Project = { project_id: string; title: string; description: string; project_url: string; technologies: string[] };
type Links = Record<LinkKey, string>;

const ICONS: Record<LinkKey, typeof Globe> = { linkedin_url: Linkedin, github_url: Github, portfolio_url: Globe };
const NAMES: Record<LinkKey, string> = { linkedin_url: "LinkedIn", github_url: "GitHub", portfolio_url: "Portfolio" };

/** Clickable LinkedIn / GitHub / Portfolio buttons. */
export function LinkBadges({ p, empty }: { p: Partial<Links>; empty?: string }) {
  const keys = (Object.keys(NAMES) as LinkKey[]).filter((k) => p[k]);
  if (!keys.length) return empty ? <p className="text-sm text-muted-foreground">{empty}</p> : null;
  return (
    <div className="flex flex-wrap gap-2">
      {keys.map((k) => { const I = ICONS[k]; return (
        <a key={k} href={p[k]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold hover:border-primary hover:text-primary">
          <I className="h-4 w-4" />{NAMES[k]}<ExternalLink className="h-3 w-3 opacity-60" />
        </a>
      ); })}
    </div>
  );
}

export function LinksForm({ uid, p, onDone }: { uid: string; p: Links; onDone: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<Links>({ linkedin_url: p.linkedin_url, github_url: p.github_url, portfolio_url: p.portfolio_url });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    const r = validateLinks(f);
    if (!r.ok) { setErr(r.error); return; }
    setErr(""); setSaving(true);
    const { error } = await supabase.from("candidate_profiles").update(r.value).eq("user_id", uid);
    setSaving(false);
    if (error) { toast.error("Couldn't save your links. Please try again."); return; }
    toast.success("Links updated");
    await qc.invalidateQueries({ queryKey: ["candidate-full", uid] });
    onDone();
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      {err && <p className="text-sm text-destructive">{err}</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        {(Object.keys(NAMES) as LinkKey[]).map((k) => (
          <Field key={k} label={`${NAMES[k]} Link`}><input className={inputCls} maxLength={300} placeholder={k === "linkedin_url" ? "linkedin.com/in/you" : k === "github_url" ? "github.com/you" : "yoursite.com"} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></Field>
        ))}
      </div>
      <SaveBar saving={saving} onCancel={onDone} />
    </form>
  );
}

/** Read-only project cards. */
export function ProjectList({ items, actions }: { items: Project[]; actions?: (p: Project) => React.ReactNode }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No projects added yet.</p>;
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {items.map((x) => (
        <li key={x.project_id} className="rounded-xl border border-border p-4">
          <div className="flex items-start justify-between gap-2">
            {x.project_url ? <a href={x.project_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold hover:text-primary">{x.title}<ExternalLink className="h-3.5 w-3.5" /></a> : <p className="font-semibold">{x.title}</p>}
            {actions?.(x)}
          </div>
          {x.description && <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{x.description}</p>}
          {x.technologies.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{x.technologies.map((t) => <span key={t} className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">{t}</span>)}</div>}
        </li>
      ))}
    </ul>
  );
}

function ProjectForm({ uid, initial, onDone }: { uid: string; initial?: Project; onDone: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ title: initial?.title ?? "", description: initial?.description ?? "", project_url: initial?.project_url ?? "", technologies: initial?.technologies ?? [] });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) return setErr("Project title is required.");
    const url = normalizeUrl(f.project_url);
    if (url === null) return setErr("Enter a valid project link.");
    setErr(""); setSaving(true);
    const row = { title: f.title.trim().slice(0, 120), description: f.description.trim().slice(0, 1000), project_url: url, technologies: f.technologies.slice(0, 15) };
    const { error } = initial
      ? await supabase.from("candidate_projects").update(row).eq("project_id", initial.project_id)
      : await supabase.from("candidate_projects").insert({ ...row, candidate_id: uid });
    setSaving(false);
    if (error) { toast.error("Couldn't save the project. Please try again."); return; }
    toast.success(initial ? "Project updated" : "Project added");
    await qc.invalidateQueries({ queryKey: ["candidate-full", uid] });
    onDone();
  }
  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-border p-4">
      {err && <p className="text-sm text-destructive">{err}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Project Title *"><input className={inputCls} maxLength={120} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Project Link"><input className={inputCls} maxLength={300} placeholder="github.com/you/project" value={f.project_url} onChange={(e) => setF({ ...f, project_url: e.target.value })} /></Field>
      </div>
      <Field label="Description"><textarea rows={3} maxLength={1000} className={inputCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      <Field label="Technologies Used"><TagInput value={f.technologies} onChange={(v) => setF({ ...f, technologies: v })} placeholder="e.g. Python — press Enter" /></Field>
      <SaveBar saving={saving} onCancel={onDone} />
    </form>
  );
}

export function ProjectsManager({ uid, items, adding, setAdding }: { uid: string; items: Project[]; adding: boolean; setAdding: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  async function remove(id: string) {
    if (!window.confirm("Delete this project?")) return;
    const { error } = await supabase.from("candidate_projects").delete().eq("project_id", id);
    if (error) { toast.error("Couldn't delete the project."); return; }
    toast.success("Project deleted");
    await qc.invalidateQueries({ queryKey: ["candidate-full", uid] });
  }
  const editItem = items.find((x) => x.project_id === editing);
  return (
    <div className="space-y-4">
      {adding && <ProjectForm uid={uid} onDone={() => setAdding(false)} />}
      {editItem && <ProjectForm key={editItem.project_id} uid={uid} initial={editItem} onDone={() => setEditing(null)} />}
      <ProjectList items={items.filter((x) => x.project_id !== editing)} actions={(x) => (
        <span className="flex shrink-0 gap-1">
          <button aria-label={`Edit ${x.title}`} onClick={() => setEditing(x.project_id)} className="rounded-lg p-1.5 hover:bg-muted"><Pencil className="h-4 w-4" /></button>
          <button aria-label={`Delete ${x.title}`} onClick={() => remove(x.project_id)} className="rounded-lg p-1.5 text-destructive hover:bg-destructive/5"><Trash2 className="h-4 w-4" /></button>
        </span>
      )} />
    </div>
  );
}
