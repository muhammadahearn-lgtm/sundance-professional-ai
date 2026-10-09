import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Send, UserCheck } from "lucide-react";
import { listJobTeam, shareProfileWithManager } from "@/lib/hiring-team.functions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** One-click, no-login review link for one hiring team member on one candidate. */
export function ShareWithManager({ candidateId, jobId }: { candidateId: string; jobId: string }) {
  const list = useServerFn(listJobTeam);
  const share = useServerFn(shareProfileWithManager);
  const q = useQuery({ queryKey: ["job-team", jobId], queryFn: () => list({ data: { jobId } }) });
  const [open, setOpen] = useState(false);
  const [who, setWho] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<"" | "email" | "copy">("");
  const [link, setLink] = useState("");

  if (!q.data?.owner) return null;
  const team = q.data.team;

  async function run(sendEmail: boolean) {
    if (!who) return;
    setBusy(sendEmail ? "email" : "copy");
    try {
      const r = await share({ data: { jobId, candidateId, stakeholderId: who, message: msg, sendEmail } });
      setLink(r.url);
      if (sendEmail) toast[r.emailed ? "success" : "warning"](r.emailed ? `Review link emailed to ${r.name}.` : "Link created, but the email could not be sent. Copy it instead.");
      else { await navigator.clipboard.writeText(r.url).catch(() => {}); toast.success("Review link copied. Paste it into Slack, Teams or email."); }
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not create the link."); }
    setBusy("");
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <div className="min-w-0"><p className="font-display font-bold">Get a hiring manager's take</p><p className="text-xs text-muted-foreground">No sign-in needed. Their feedback lands in Team Notes.</p></div>
        <button onClick={() => { setOpen(true); setLink(""); }} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90"><UserCheck className="h-4 w-4" />Share with Hiring Manager</button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share with Hiring Manager</DialogTitle>
            <DialogDescription>For {q.data.jobTitle}. They see first name + last initial only — never contact details or current employer. Link expires in 14 days.</DialogDescription>
          </DialogHeader>
          {!team.length ? <p className="text-sm text-muted-foreground">This job has no hiring team yet. Add them on the job page first.</p> : (
            <div className="space-y-4">
              <div role="radiogroup" aria-label="Hiring team member" className="space-y-2">
                {team.map((m) => (
                  <button key={m.stakeholder_id} role="radio" aria-checked={who === m.stakeholder_id} onClick={() => setWho(m.stakeholder_id)}
                    className={`w-full rounded-xl border p-3 text-left text-sm ${who === m.stakeholder_id ? "border-primary ring-2 ring-primary/25" : "border-border hover:border-primary/40"}`}>
                    <span className="font-semibold">{m.name}</span>{m.hiring_role ? <span className="text-muted-foreground"> · {m.hiring_role}</span> : null}
                    <span className="block text-xs text-muted-foreground">{m.email}</span>
                  </button>
                ))}
              </div>
              <label className="block text-sm"><span className="font-semibold">Note for them</span> <span className="text-muted-foreground">(optional, in the email)</span>
                <textarea value={msg} onChange={(e) => setMsg(e.target.value.slice(0, 500))} rows={2} placeholder="e.g. Take a look at their distributed systems work"
                  className="mt-1.5 w-full rounded-xl border border-border bg-background p-2.5 text-sm outline-none focus:border-primary" />
              </label>
              {link && <p className="break-all rounded-lg bg-muted p-2 text-xs">{link}</p>}
              <div className="flex flex-wrap justify-end gap-2">
                <button onClick={() => run(false)} disabled={!who || !!busy} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"><Copy className="h-4 w-4" />{busy === "copy" ? "Creating…" : "Copy link"}</button>
                <button onClick={() => run(true)} disabled={!who || !!busy} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Send className="h-4 w-4" />{busy === "email" ? "Sending…" : "Send email"}</button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
