import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ClipboardCheck, Clock } from "lucide-react";
import { myReferenceRequests, submitReferences } from "@/lib/references.functions";
import { RELATIONSHIPS, relationshipLabel, validateReferences, type RefInput } from "@/lib/references";

const blank = (): RefInput => ({ name: "", email: "", relationship: "manager", company: "", workedTogether: "" });
const input = "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm";

/** Candidate side: add the references a recruiter asked for. Never shows referee answers. */
export function MyReferences({ jobId }: { jobId: string }) {
  const qc = useQueryClient();
  const get = useServerFn(myReferenceRequests);
  const submit = useServerFn(submitReferences);
  const q = useQuery({ queryKey: ["my-references", jobId], queryFn: () => get({ data: { jobId } }) });
  const [refs, setRefs] = useState<RefInput[]>([]);
  const [busy, setBusy] = useState(false);
  const target = q.data?.target_count ?? 0;
  useEffect(() => { if (target) setRefs(Array.from({ length: target }, blank)); }, [target]);

  if (!q.data) return null;
  const r = q.data;
  const set = (i: number, k: keyof RefInput, v: string) => setRefs((xs) => xs.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  async function send() {
    const err = validateReferences(refs, target);
    if (err) { toast.error(err); return; }
    setBusy(true);
    try { await submit({ data: { requestId: r.request_id, refs } }); toast.success("Thanks! Your references have been invited."); qc.invalidateQueries({ queryKey: ["my-references", jobId] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not send references."); }
    setBusy(false);
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-card p-6 shadow-soft">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold"><ClipboardCheck className="h-5 w-5 text-primary" />Professional references</h2>
      {r.status === "awaiting_candidate" ? <>
        <p className="mt-1 text-sm text-muted-foreground">The recruiter asked for {target} reference{target > 1 ? "s" : ""}. Each person gets a short form by email — no account needed. Let them know to expect it.</p>
        {r.message && <p className="mt-2 rounded-lg bg-muted p-2 text-sm italic">“{r.message}”</p>}
        <div className="mt-4 space-y-4">{refs.map((x, i) => (
          <fieldset key={i} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2">
            <legend className="px-1 text-xs font-semibold text-muted-foreground">Reference {i + 1}</legend>
            <input aria-label="Full name" placeholder="Full name" value={x.name} onChange={(e) => set(i, "name", e.target.value)} className={input} maxLength={120} />
            <input aria-label="Work email" type="email" placeholder="Work email" value={x.email} onChange={(e) => set(i, "email", e.target.value)} className={input} maxLength={254} />
            <select aria-label="Relationship" value={x.relationship} onChange={(e) => set(i, "relationship", e.target.value)} className={input}>{RELATIONSHIPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
            <input aria-label="Company" placeholder="Company" value={x.company} onChange={(e) => set(i, "company", e.target.value)} className={input} maxLength={160} />
            <input aria-label="When you worked together" placeholder="Worked together (e.g. 2021–2024)" value={x.workedTogether} onChange={(e) => set(i, "workedTogether", e.target.value)} className={`${input} sm:col-span-2`} maxLength={120} />
          </fieldset>))}</div>
        <button disabled={busy} onClick={send} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Sending…" : "Send to my references"}</button>
      </> : <ul className="mt-3 space-y-2">{r.refs.map((x) => (
        <li key={x.reference_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3 text-sm">
          <span><span className="font-semibold">{x.name}</span> <span className="text-muted-foreground">· {relationshipLabel(x.relationship)}</span></span>
          {x.status === "completed" ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-success"><CheckCircle2 className="h-3.5 w-3.5" />Responded</span>
            : <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" />Waiting</span>}
        </li>))}</ul>}
    </div>
  );
}
