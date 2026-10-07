import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, Loader2, Send, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useScores } from "@/components/match/Match";
import { loadSaveJobOptions, type CandidateFull } from "@/lib/talent-data";
import type { Taxonomy } from "@/lib/jobs-data";
import { inviteMessage } from "@/lib/candidate-invite";
import { card, inputCls } from "@/components/profile/parts";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const nm = (opts: { id: string; name: string }[], id: string) => opts.find((o) => o.id === id)?.name ?? "";

function useActiveJobs(uid: string) {
  const q = useQuery({ queryKey: ["save-job-options", uid], queryFn: () => loadSaveJobOptions(uid) });
  return { ...q, active: (q.data ?? []).filter((j) => j.job_status === "active") };
}

/** Required/preferred requirements of a job, split into matched and missing for this candidate. */
function useReqFit(jobId: string, d: CandidateFull, t: Taxonomy) {
  return useQuery({
    queryKey: ["lens-reqs", jobId, d.profile.user_id],
    enabled: !!jobId,
    queryFn: async () => {
      const [l, s, tc] = await Promise.all([
        supabase.from("job_languages").select("lookup_id").eq("job_id", jobId),
        supabase.from("job_skills").select("lookup_id").eq("job_id", jobId),
        supabase.from("job_technologies").select("lookup_id").eq("job_id", jobId),
      ]);
      const has = new Set([...d.languages, ...d.skills, ...d.technologies].map((r) => r.lookup_id));
      const all = [
        ...(l.data ?? []).map((r) => nm(t.languages, r.lookup_id) && { id: r.lookup_id, name: nm(t.languages, r.lookup_id) }),
        ...(s.data ?? []).map((r) => nm(t.skills, r.lookup_id) && { id: r.lookup_id, name: nm(t.skills, r.lookup_id) }),
        ...(tc.data ?? []).map((r) => nm(t.technologies, r.lookup_id) && { id: r.lookup_id, name: nm(t.technologies, r.lookup_id) }),
      ].filter(Boolean) as { id: string; name: string }[];
      return { matched: all.filter((x) => has.has(x.id)).map((x) => x.name), missing: all.filter((x) => !has.has(x.id)).map((x) => x.name) };
    },
  });
}

function ringTone(s: number) { return s >= 90 ? "text-success" : s >= 75 ? "text-primary" : s >= 60 ? "text-warning" : "text-muted-foreground"; }

function Ring({ score }: { score: number }) {
  const r = 34, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, score));
  return (
    <div className={`relative h-24 w-24 ${ringTone(v)}`}>
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90"><circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth={7} /><circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth={7} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} /></svg>
      <div className="absolute inset-0 grid place-items-center"><span className="font-display text-2xl font-extrabold text-foreground">{Math.round(v)}%</span></div>
    </div>
  );
}

/** Live match of this candidate against one of the recruiter's active jobs. */
export function JobMatchLens({ uid, d, t, jobId, onJob }: { uid: string; d: CandidateFull; t: Taxonomy; jobId: string; onJob: (id: string) => void }) {
  const jobs = useActiveJobs(uid);
  const scores = useScores({ candidateId: d.profile.user_id, jobIds: jobs.active.map((j) => j.job_id) });
  const best = scores.data?.[0]?.job_id;
  useEffect(() => { if (!jobId && jobs.active.length) onJob(best ?? jobs.active[0]!.job_id); }, [jobId, best, jobs.active, onJob]);
  const row = scores.data?.find((r) => r.job_id === jobId);
  const fit = useReqFit(jobId, d, t);
  const bars: [string, number | undefined, string][] = [
    ["Skills", row?.skill_alignment_score, "30%"], ["Languages", row?.language_alignment_score, "20%"], ["Tools", row?.technology_alignment_score, "20%"],
    ["Experience", row?.experience_alignment_score, "20%"], ["Preferences", row?.preference_alignment_score, "10%"],
  ];
  return (
    <div className={`${card} relative overflow-hidden p-5`}>
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl" aria-hidden />
      <div className="relative flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><p className="font-display font-bold">Job Match Lens</p></div>
      {jobs.isLoading ? <div className="mt-4 h-40 animate-pulse rounded-xl bg-muted" />
        : !jobs.active.length ? <p className="relative mt-3 text-sm text-muted-foreground">Publish a job to see how this candidate matches it.</p>
        : <div className="relative">
          <select aria-label="Match against job" value={jobId} onChange={(e) => onJob(e.target.value)} className={`${inputCls} mt-3 h-10`}>
            {jobs.active.map((j) => { const s = scores.data?.find((r) => r.job_id === j.job_id); return <option key={j.job_id} value={j.job_id}>{j.job_title} · {j.company_name}{s ? ` — ${Math.round(Number(s.overall_match_score))}%` : ""}{j.job_id === best ? " ✦" : ""}</option>; })}
          </select>
          {row ? <>
            <div className="mt-4 flex items-center gap-4"><Ring score={Number(row.overall_match_score)} /><p className="text-sm text-muted-foreground">{jobId === best ? <span className="font-semibold text-primary">✦ Best fit among your jobs. </span> : null}Scored on skills, languages, tools, experience and preferences.</p></div>
            <ul className="mt-4 space-y-2.5">{bars.map(([l, v, w]) => <li key={l}><div className="flex justify-between text-xs"><span>{l} <span className="text-muted-foreground">· {w}</span></span><span className="font-semibold">{v == null ? "—" : `${Math.round(Number(v))}%`}</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-primary" style={{ width: `${Math.max(0, Math.min(100, Number(v ?? 0)))}%` }} /></div></li>)}</ul>
          </> : <p className="mt-4 text-sm text-muted-foreground">{scores.isLoading ? "Loading score…" : "Score not calculated yet for this job."}</p>}
          {fit.data && (fit.data.matched.length + fit.data.missing.length > 0) && <div className="mt-4 flex flex-wrap gap-1.5">
            {fit.data.matched.map((n) => <span key={`m${n}`} className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success"><Check className="h-3 w-3" />{n}</span>)}
            {fit.data.missing.map((n) => <span key={`x${n}`} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"><X className="h-3 w-3" />{n}</span>)}
          </div>}
        </div>}
    </div>
  );
}

/** "Invite to Apply": pick a job, edit a pre-filled note, send it as a message. */
export function InviteToApplyButton({ uid, d, t, jobId, className }: { uid: string; d: CandidateFull; t: Taxonomy; jobId: string; className: string }) {
  const [open, setOpen] = useState(false);
  const [job, setJob] = useState(jobId);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const jobs = useActiveJobs(uid);
  const fit = useReqFit(job, d, t);
  const nav = useNavigate();
  const qc = useQueryClient();
  const sel = jobs.active.find((j) => j.job_id === job);
  const draft = useMemo(() => sel ? inviteMessage(d.name, sel.job_title, sel.company_name, fit.data?.matched ?? []) : "", [sel, d.name, fit.data]);
  useEffect(() => { if (open) setJob((j) => j || jobId || jobs.active[0]?.job_id || ""); }, [open, jobId, jobs.active]);
  useEffect(() => { setText(draft); }, [draft]);
  async function send() {
    if (!job || !text.trim()) return;
    setBusy(true);
    const { data: conv, error } = await supabase.rpc("start_conversation", { _candidate: d.profile.user_id, _job: job });
    if (error || !conv) { setBusy(false); toast.error("Couldn't send the invite. Please try again."); return; }
    const m = await supabase.from("messages").insert({ conversation_id: conv, sender_id: uid, sender_type: "recruiter", message_body: text.trim() });
    setBusy(false);
    if (m.error) { toast.error("Couldn't send the invite. Please try again."); return; }
    qc.invalidateQueries({ queryKey: ["inbox"] });
    toast.success(`Invite sent to ${d.name}`);
    setOpen(false);
    nav({ to: "/recruiter/messages/$conversationId", params: { conversationId: conv } });
  }
  return (<>
    <button type="button" onClick={() => setOpen(true)} className={className}><Send className="h-4 w-4" />Invite to Apply</button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Invite {d.name} to apply</DialogTitle><DialogDescription>We drafted a note from their matching skills. Edit it before sending.</DialogDescription></DialogHeader>
        {!jobs.active.length ? <p className="text-sm text-muted-foreground">You have no active jobs to invite candidates to yet.</p> : <div className="space-y-3">
          <select aria-label="Job to invite to" value={job} onChange={(e) => setJob(e.target.value)} className={`${inputCls} h-10`}>{jobs.active.map((j) => <option key={j.job_id} value={j.job_id}>{j.job_title} · {j.company_name}</option>)}</select>
          <textarea aria-label="Invite message" value={text} onChange={(e) => setText(e.target.value)} rows={6} className={`${inputCls} py-2`} />
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">Cancel</button>
            <button type="button" onClick={send} disabled={busy || !text.trim()} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Send invite</button></div>
        </div>}
      </DialogContent>
    </Dialog>
  </>);
}
