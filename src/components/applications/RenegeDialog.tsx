import { useState } from "react";
import { Medal, UserX } from "lucide-react";
import { toast } from "sonner";
import { card, friendlyError, inputCls } from "@/components/profile/parts";
import { btn, primaryBtn } from "@/components/talent/Talent";
import { supabase } from "@/integrations/supabase/client";
import { RENEGE_NOTE_MAX, RENEGE_REASONS } from "@/lib/renege";

const Shell = ({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) => (
  <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" role="dialog" aria-modal="true" aria-label={label} onClick={onClose}>
    <div className={`${card} max-h-[92vh] w-full max-w-lg overflow-y-auto p-6`} onClick={(e) => e.stopPropagation()}>{children}</div>
  </div>
);

/** Recruiter: record that a hired candidate backed out. Frees the seat and can reopen the job. */
export function RenegeDialog({ name, jobId, candidateId, jobClosed, onDone, onClose }: { name: string; jobId: string; candidateId: string; jobClosed: boolean; onDone: () => void; onClose: () => void }) {
  const [reason, setReason] = useState(""), [note, setNote] = useState(""), [reopen, setReopen] = useState(true), [busy, setBusy] = useState(false);
  async function submit() {
    if (!reason) { toast.error("Please choose a reason"); return; }
    setBusy(true);
    const { error } = await supabase.rpc("record_hire_renege", { _job: jobId, _candidate: candidateId, _reason: reason, _note: note, _reopen: reopen });
    setBusy(false);
    if (error) { toast.error(friendlyError(error, "Couldn't record this.")); return; }
    toast.success(`${name} marked as backed out — the spot is open again`); onDone();
  }
  return (
    <Shell label="Report renege" onClose={onClose}>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-warning"><UserX className="h-3 w-3" />Backed out after hire</span>
      <h2 className="mt-2 font-display text-xl font-extrabold">Did {name} back out?</h2>
      <p className="mt-1 text-sm text-muted-foreground">This frees their spot, withdraws their offer and keeps a private record of why. {name} won't get an automatic email.</p>
      <fieldset className="mt-4 grid gap-2"><legend className="mb-1 text-sm font-semibold">Reason</legend>
        {RENEGE_REASONS.map(([k, l]) => <label key={k} className={`flex items-center gap-2 rounded-xl border p-2.5 text-sm ${reason === k ? "border-primary bg-primary-soft" : "border-border"}`}><input type="radio" name="renege" checked={reason === k} onChange={() => setReason(k)} />{l}</label>)}
      </fieldset>
      <label className="mt-4 block text-sm font-semibold">Private note (optional)<textarea rows={3} maxLength={RENEGE_NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)} className={`${inputCls} mt-1`} placeholder="e.g. Current employer matched with a 20% raise" /></label>
      {jobClosed && <label className="mt-4 flex items-start gap-2 rounded-xl border border-border p-3 text-sm"><input type="checkbox" checked={reopen} onChange={(e) => setReopen(e.target.checked)} className="mt-0.5" /><span><strong>Reopen this job</strong><span className="block text-muted-foreground">Put the role back on the board so you can fill the spot.</span></span></label>}
      <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className={btn}>Cancel</button><button type="button" onClick={submit} disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Confirm Backed Out"}</button></div>
    </Shell>
  );
}

type Runner = { pipeline_id: string; candidate_id: string; name: string; candTitle: string };
/** After a renege: one-click revive of runners-up into Offer or Shortlisted. */
export function FastTrackDialog({ runners, silverIds, onRevive, onClose }: { runners: Runner[]; silverIds: Set<string>; onRevive: (r: Runner, stage: "offer" | "shortlisted") => void; onClose: () => void }) {
  return (
    <Shell label="Fast-track a runner-up" onClose={onClose}>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary"><Medal className="h-3 w-3" />Fast-track</span>
      <h2 className="mt-2 font-display text-xl font-extrabold">Fill the spot with a runner-up</h2>
      <p className="mt-1 text-sm text-muted-foreground">These candidates were closed out of this job earlier. Bring one back instead of starting over.</p>
      {runners.length ? <ul className="mt-4 space-y-2">{runners.map((r) => <li key={r.pipeline_id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3">
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{r.name}{silverIds.has(r.candidate_id) && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary"><Medal className="h-3 w-3" />Silver Medalist</span>}</p><p className="truncate text-xs text-muted-foreground">{r.candTitle}</p></div>
        <button type="button" onClick={() => onRevive(r, "shortlisted")} className={btn}>Final Interview</button>
        <button type="button" onClick={() => onRevive(r, "offer")} className={primaryBtn}>Make Offer</button>
      </li>)}</ul> : <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">No runners-up on this job yet. Check Saved Candidates or new applications.</p>}
      <div className="mt-6 flex justify-end"><button type="button" onClick={onClose} className={btn}>Done</button></div>
    </Shell>
  );
}
