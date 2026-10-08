import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Download, Lock, Send, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { resumeUrl } from "@/lib/talent-data";

const REASON_LABEL: Record<string, string> = { applicant: "Applied to your job", approved_request: "Approved request", open_access: "Open to recruiters" };

/** Recruiter-side resume button: downloads when permitted, otherwise lets the recruiter ask the candidate. */
export function RecruiterResumeAction({ candidateId, resume }: { candidateId: string; resume: { kind: string; path: string; fileName: string | null } }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [asking, setAsking] = useState(false);
  const access = useQuery({
    queryKey: ["resume-access", candidateId],
    queryFn: async () => {
      const [r, req] = await Promise.all([
        supabase.rpc("resume_access_reason", { _candidate: candidateId }),
        supabase.from("resume_access_requests").select("status, responded_at").eq("candidate_id", candidateId).order("created_at", { ascending: false }).limit(1),
      ]);
      return { reason: (r.data as string | null) ?? null, last: req.data?.[0] ?? null };
    },
  });
  async function download() {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("log_resume_download", { _candidate: candidateId, _kind: resume.kind });
      if (error) throw error;
      window.open(await resumeUrl(resume.path, resume.fileName), "_blank", "noopener");
    } catch { toast.error("Resume not available."); }
    setBusy(false);
  }
  async function request() {
    setBusy(true);
    const { error } = await supabase.rpc("request_resume_access", { _candidate: candidateId, _message: note.trim() });
    setBusy(false);
    if (error) { toast.error(error.message.includes("30 days") ? error.message : "Couldn't send the request."); return; }
    toast.success("Request sent — we'll notify you when the candidate responds.");
    setAsking(false); setNote("");
    await qc.invalidateQueries({ queryKey: ["resume-access", candidateId] });
  }
  if (access.isLoading) return null;
  const reason = access.data?.reason;
  if (reason) return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={download} disabled={busy}><Download className="h-4 w-4" />Download PDF</Button>
      <span className="text-xs text-muted-foreground">{REASON_LABEL[reason]} · downloads are shown to the candidate</span>
    </div>
  );
  const last = access.data?.last;
  if (last?.status === "pending") return <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm text-muted-foreground"><Send className="h-4 w-4" />Request pending</span>;
  const recentlyDeclined = last?.status === "declined" && last.responded_at && Date.now() - new Date(last.responded_at).getTime() < 30 * 864e5;
  if (recentlyDeclined) return <span className="text-sm text-muted-foreground">The candidate declined. You can ask again after 30 days.</span>;
  if (!asking) return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" onClick={() => setAsking(true)}><Lock className="h-4 w-4" />Request resume</Button>
      <span className="text-xs text-muted-foreground">The candidate decides who can download their resume.</span>
    </div>
  );
  return (
    <div className="w-full space-y-2">
      <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 500))} rows={3} placeholder="Optional note — e.g. the role you have in mind" className="w-full rounded-md border bg-background p-2 text-sm" />
      <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setAsking(false)}>Cancel</Button><Button onClick={request} disabled={busy}><Send className="h-4 w-4" />Send request</Button></div>
    </div>
  );
}

type Activity = { kind: string; id: string; recruiter_name: string | null; company_name: string | null; status: string | null; message: string | null; reason: string | null; created_at: string; expires_at: string | null };

/** Candidate-side privacy controls: access setting, pending requests, and download history. */
export function CandidateResumeAccessPanel({ uid, requireRequest }: { uid: string; requireRequest: boolean }) {
  const qc = useQueryClient();
  const [strict, setStrict] = useState(requireRequest);
  const activity = useQuery({ queryKey: ["resume-activity", uid], queryFn: async () => { const { data, error } = await supabase.rpc("my_resume_activity"); if (error) throw error; return (data ?? []) as Activity[]; } });
  async function toggle(v: boolean) {
    setStrict(v);
    const { error } = await supabase.from("candidate_profiles").update({ require_resume_request: v }).eq("user_id", uid);
    if (error) { setStrict(!v); toast.error("Couldn't update the setting."); return; }
    toast.success(v ? "Recruiters must ask before downloading" : "Recruiters who find you can download your resume");
    await qc.invalidateQueries({ queryKey: ["candidate-full", uid] });
  }
  async function respond(id: string, approve: boolean) {
    const { error } = await supabase.rpc("respond_resume_request", { _request: id, _approve: approve });
    if (error) { toast.error("Couldn't respond to the request."); return; }
    toast.success(approve ? "Approved for 30 days" : "Request declined");
    await qc.invalidateQueries({ queryKey: ["resume-activity", uid] });
  }
  const rows = activity.data ?? [];
  const pending = rows.filter((r) => r.kind === "request" && r.status === "pending");
  const history = rows.filter((r) => !(r.kind === "request" && r.status === "pending")).slice(0, 15);
  const who = (r: Activity) => [r.recruiter_name ?? "A recruiter", r.company_name].filter(Boolean).join(" at ");
  const when = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return (
    <div className="space-y-4 rounded-xl border p-5">
      <div className="flex items-start justify-between gap-4">
        <div><h3 className="flex items-center gap-2 font-display font-bold"><ShieldCheck className="h-4 w-4 text-primary" />Who can download your resume</h3>
          <p className="mt-1 text-sm text-muted-foreground">Recruiters you apply to can always download it. {strict ? "Others must ask you first." : "Recruiters who find you in Talent Search can download it too."}</p></div>
        <label className="flex shrink-0 items-center gap-2 text-sm font-medium">Ask me first<Switch checked={strict} onCheckedChange={toggle} /></label>
      </div>
      {pending.length > 0 && <div className="space-y-2"><p className="text-sm font-semibold">Requests waiting for you</p>{pending.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 p-3">
          <div className="min-w-0"><p className="text-sm font-medium">{who(r)}</p>{r.message && <p className="text-sm text-muted-foreground">“{r.message}”</p>}<p className="text-xs text-muted-foreground">{when(r.created_at)}</p></div>
          <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => respond(r.id, false)}><X className="h-4 w-4" />Decline</Button><Button size="sm" onClick={() => respond(r.id, true)}><Check className="h-4 w-4" />Approve 30 days</Button></div>
        </div>))}</div>}
      <div><p className="text-sm font-semibold">Activity</p>{history.length ? <ul className="mt-2 space-y-1.5">{history.map((r) => (
        <li key={r.id} className="text-sm text-muted-foreground"><span className="font-medium text-foreground">{who(r)}</span> {r.kind === "download" ? `downloaded your resume${r.reason === "applicant" ? " (from your application)" : ""}` : r.status === "approved" ? `— request approved${r.expires_at ? ` until ${when(r.expires_at)}` : ""}` : "— request declined"} · {when(r.created_at)}</li>))}</ul>
        : <p className="mt-1 text-sm text-muted-foreground">No downloads or requests yet.</p>}</div>
    </div>
  );
}
