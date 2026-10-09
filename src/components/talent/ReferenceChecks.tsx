import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { BellRing, CheckCircle2, ClipboardCheck, Clock, Lock, Star } from "lucide-react";
import { cancelReferenceRequest, getReferenceSummary, remindReferee, requestReferences } from "@/lib/references.functions";
import { canRequestReferences, referenceProgress, relationshipLabel } from "@/lib/references";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const btn = "inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50";

/** Optional reference checks card on a candidate profile (job owner only). */
export function ReferenceChecks({ candidateId, jobId }: { candidateId: string; jobId: string }) {
  const qc = useQueryClient();
  const get = useServerFn(getReferenceSummary);
  const ask = useServerFn(requestReferences);
  const cancel = useServerFn(cancelReferenceRequest);
  const remind = useServerFn(remindReferee);
  const key = ["references", jobId, candidateId];
  const q = useQuery({ queryKey: key, queryFn: () => get({ data: { jobId, candidateId } }) });
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(2);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  if (!q.data?.owner) return null;
  const { request, refs, stage } = q.data;
  if (!request && !canRequestReferences(stage)) return null;
  const refresh = () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ["reference-badges"] }); };

  async function send() {
    setBusy(true);
    try { await ask({ data: { jobId, candidateId, count, message: msg } }); toast.success("Reference request sent to the candidate."); setOpen(false); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not request references."); }
    setBusy(false);
  }

  const done = refs.filter((r) => r.status === "completed").length;
  const prog = request ? referenceProgress(request.target_count, done, request.status) : null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-display font-bold"><ClipboardCheck className="h-4 w-4 text-primary" />Reference checks <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Optional</span></p>
          <p className="text-xs text-muted-foreground">{prog ? prog.label : "Never required to hire. Answers stay private to you and your team."}</p>
        </div>
        {!request ? <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Request References</button>
          : request.status !== "completed" && <button disabled={busy} onClick={async () => { if (!confirm("Cancel this reference request?")) return; setBusy(true); try { await cancel({ data: { requestId: request.request_id } }); refresh(); } catch { toast.error("Could not cancel."); } setBusy(false); }} className={btn}>Cancel request</button>}
      </div>

      {request?.status === "awaiting_candidate" && <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground"><Clock className="h-4 w-4" />Waiting for the candidate to add {request.target_count} reference{request.target_count > 1 ? "s" : ""}.</p>}

      {refs.length > 0 && <ul className="mt-3 space-y-3">{refs.map((r) => (
        <li key={r.reference_id} className="rounded-xl border border-border p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><p className="font-semibold">{r.name} <span className="font-normal text-muted-foreground">· {relationshipLabel(r.relationship)}{r.company ? `, ${r.company}` : ""}</span></p>
              <p className="text-xs text-muted-foreground">{r.email}{r.worked_together ? ` · ${r.worked_together}` : ""}</p></div>
            {r.status === "completed"
              ? <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-bold text-success"><Star className="h-3 w-3 fill-current" />{r.rating}/5 would work with again</span>
              : <button disabled={busy} onClick={async () => { setBusy(true); try { const x = await remind({ data: { referenceId: r.reference_id } }); toast[x.sent ? "success" : "warning"](x.sent ? `Reminder sent to ${r.name}.` : "Reminder could not be emailed."); refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not send reminder."); } setBusy(false); }} className={btn}><BellRing className="h-3.5 w-3.5" />Remind</button>}
          </div>
          {r.status === "completed" && <div className="mt-2 space-y-1.5 text-sm">
            {r.confirmed_relationship === false && <p className="text-xs font-semibold text-warning">Referee did not confirm the relationship details.</p>}
            {r.strengths && <p><span className="font-semibold">Strengths: </span>{r.strengths}</p>}
            {r.growth && <p><span className="font-semibold">Areas to grow: </span>{r.growth}</p>}
            {r.rehire_comment && <p><span className="font-semibold">Comment: </span>{r.rehire_comment}</p>}
            {r.confidential_note && <p className="rounded-lg bg-muted p-2 text-xs"><Lock className="mr-1 inline h-3 w-3" /><span className="font-semibold">Confidential to recruiter: </span>{r.confidential_note}</p>}
          </div>}
          {r.status !== "completed" && <p className="mt-1 text-xs text-muted-foreground">Invite sent{r.reminded_at ? " · reminded" : ""}</p>}
        </li>))}</ul>}
      {prog?.done && <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-success"><CheckCircle2 className="h-4 w-4" />All references complete. Copies are in Team Notes.</p>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request References</DialogTitle>
            <DialogDescription>The candidate adds their referees; each gets a 2-minute form with no sign-in. The candidate never sees the answers.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><p className="mb-2 text-sm font-semibold">How many references?</p>
              <div className="flex gap-2">{[1, 2, 3].map((n) => <button key={n} onClick={() => setCount(n)} aria-pressed={count === n} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${count === n ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{n}</button>)}</div></div>
            <label className="block text-sm"><span className="font-semibold">Note to the candidate (optional)</span>
              <textarea value={msg} onChange={(e) => setMsg(e.target.value.slice(0, 500))} rows={3} placeholder="Ideally include one former manager." className="mt-1 w-full rounded-xl border border-input bg-background p-2 text-sm" /></label>
            <button disabled={busy} onClick={send} className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Sending…" : "Send request"}</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
