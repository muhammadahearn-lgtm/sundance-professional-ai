import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { addTeamNote, canEditNote, deleteTeamNote, listTeamNotes, NOTE_MAX, updateTeamNote, validateNote, type TeamNote } from "@/lib/team-notes";

const box = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString();
}

/** Private recruiter/hiring-team notes on a candidate. Never shown to candidates (DB-enforced). */
export function TeamNotes({ candidateId, jobId }: { candidateId: string; jobId?: string | undefined }) {
  const qc = useQueryClient();
  const key = ["team-notes", candidateId];
  const uidQ = useQuery({ queryKey: ["auth-uid"], queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? "" });
  const q = useQuery({ queryKey: key, queryFn: () => listTeamNotes(candidateId) });
  const [text, setText] = useState("");
  const [tag, setTag] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: key });

  async function add() {
    const err = validateNote(text);
    if (err) { toast.error(err); return; }
    setBusy(true);
    try { await addTeamNote(candidateId, text, jobId && tag ? jobId : null); setText(""); refresh(); }
    catch { toast.error("Couldn't save the note."); }
    setBusy(false);
  }
  async function save(n: TeamNote) {
    const err = validateNote(draft);
    if (err) { toast.error(err); return; }
    try { await updateTeamNote(n.note_id, draft); setEditing(null); refresh(); } catch { toast.error("Couldn't update the note."); }
  }
  async function remove(n: TeamNote) {
    if (!confirm("Delete this note?")) return;
    try { await deleteTeamNote(n.note_id); refresh(); } catch { toast.error("Couldn't delete the note."); }
  }

  const uid = uidQ.data ?? "";
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold">Team Notes</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"><Lock className="h-3 w-3" />Private to your team</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Never visible to the candidate.</p>
      <textarea className={`${box} mt-3 min-h-20`} maxLength={NOTE_MAX} value={text} onChange={(e) => setText(e.target.value)} placeholder="Interview impressions, reference checks, next steps…" />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{text.length}/{NOTE_MAX}</span>
          {jobId && <label className="inline-flex items-center gap-1"><input type="checkbox" checked={tag} onChange={(e) => setTag(e.target.checked)} />Tag to this job</label>}
        </div>
        <button type="button" disabled={busy || !text.trim()} onClick={add} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">Add Note</button>
      </div>
      <ul className="mt-4 space-y-3">
        {q.isLoading && <li className="h-14 animate-pulse rounded-lg bg-muted" />}
        {q.isError && <li className="text-sm text-destructive">Couldn't load notes.</li>}
        {q.data?.length === 0 && <li className="text-sm text-muted-foreground">No notes yet.</li>}
        {q.data?.map((n) => (
          <li key={n.note_id} className="rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span><strong className="text-foreground">{n.author_id === uid ? "You" : n.author_name}</strong> · {ago(n.created_at)}{n.updated_at !== n.created_at && " · edited"}</span>
              {canEditNote(n, uid) && editing !== n.note_id && (
                <span className="flex gap-1">
                  <button type="button" aria-label="Edit note" onClick={() => { setEditing(n.note_id); setDraft(n.content); }} className="rounded p-1 hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
                  <button type="button" aria-label="Delete note" onClick={() => remove(n)} className="rounded p-1 hover:bg-muted"><Trash2 className="h-3.5 w-3.5" /></button>
                </span>
              )}
            </div>
            {n.job_title && <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Re: {n.job_title}</span>}
            {editing === n.note_id ? (
              <div className="mt-2">
                <textarea className={`${box} min-h-16`} maxLength={NOTE_MAX} value={draft} onChange={(e) => setDraft(e.target.value)} />
                <div className="mt-2 flex justify-end gap-2 text-sm">
                  <button type="button" onClick={() => setEditing(null)} className="rounded-lg px-3 py-1 hover:bg-muted">Cancel</button>
                  <button type="button" onClick={() => save(n)} className="rounded-lg bg-primary px-3 py-1 font-semibold text-primary-foreground">Save</button>
                </div>
              </div>
            ) : <p className="mt-1 whitespace-pre-line text-sm">{n.content}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
