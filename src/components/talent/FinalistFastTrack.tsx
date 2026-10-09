import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Medal, Rocket } from "lucide-react";
import { listSavedEntries, loadSaveJobOptions } from "@/lib/talent-data";
import { addToPipeline } from "@/lib/applications-data";
import { FAST_TRACK_STAGES, fastTrackJobs, finalistLabel, type FastTrackStage } from "@/lib/saved-candidates";
import { useSession } from "@/hooks/use-session";

function useFinalist(uid: string, candidateId: string) {
  const entries = useQuery({ queryKey: ["saved-entries", uid, "map"], queryFn: () => listSavedEntries(uid), enabled: !!uid });
  const jobs = useQuery({ queryKey: ["save-job-options", uid], queryFn: () => loadSaveJobOptions(uid), enabled: !!uid });
  const entry = entries.data?.find((x) => x.candidate_id === candidateId);
  return { entry, jobs: jobs.data ?? [], text: finalistLabel(entry, jobs.data ?? []) };
}

/** Gold "Finalist: <job>" badge for Silver Medalists in talent search cards. */
export function FinalistBadge({ uid, candidateId }: { uid: string; candidateId: string }) {
  const { text } = useFinalist(uid, candidateId);
  if (!text) return null;
  return <span title={`Silver Medalist · ${text}`} className="inline-flex max-w-full items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-foreground"><Medal className="h-3 w-3 shrink-0 text-warning" /><span className="truncate">{text}</span></span>;
}

/** Profile panel: finalist pedigree + one-click add to an open job at a late stage. */
export function FinalistFastTrackPanel({ candidateId, name }: { candidateId: string; name: string }) {
  const { session } = useSession();
  const uid = session?.user.id ?? "";
  const qc = useQueryClient();
  const { entry, jobs, text } = useFinalist(uid, candidateId);
  const options = fastTrackJobs(jobs, entry?.silver_medalist_job_id);
  const [job, setJob] = useState("");
  const [stage, setStage] = useState<FastTrackStage>("interviewing");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  if (!text) return null;

  async function add() {
    if (!job) return;
    setBusy(true);
    try {
      await addToPipeline(uid, candidateId, job, stage);
      setDone(job);
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      toast.success(`${name} added to the board at ${stage === "shortlisted" ? "Shortlisted" : "Interviewing"}.`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not add to the job."); }
    finally { setBusy(false); }
  }

  return (
    <div className="rounded-2xl border border-warning/40 bg-warning/10 p-5">
      <p className="flex items-center gap-2 font-display text-base font-bold"><Medal className="h-5 w-5 text-warning" />Silver Medalist</p>
      <p className="mt-1 text-sm text-muted-foreground">{text}{entry?.silver_medalist_at ? ` · ${new Date(entry.silver_medalist_at).toLocaleDateString()}` : ""}. Already vetted — skip cold outreach.</p>
      {done ? <p className="mt-3 text-sm font-semibold">Added. <Link to="/recruiter/pipeline/$jobId" params={{ jobId: done }} className="text-primary hover:underline">Open the board</Link></p>
        : options.length === 0 ? <p className="mt-3 text-xs text-muted-foreground">You have no other open jobs to fast-track into.</p>
        : <div className="mt-3 space-y-2">
          <select aria-label="Open job" value={job} onChange={(e) => setJob(e.target.value)} className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"><option value="">Choose an open job…</option>{options.map((j) => <option key={j.job_id} value={j.job_id}>{j.job_title} · {j.company_name}</option>)}</select>
          <select aria-label="Starting stage" value={stage} onChange={(e) => setStage(e.target.value as FastTrackStage)} className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm">{FAST_TRACK_STAGES.map((s) => <option key={s.value} value={s.value}>Start at {s.label}</option>)}</select>
          <button type="button" disabled={!job || busy} onClick={add} className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"><Rocket className="h-4 w-4" />{busy ? "Adding…" : "Add to Requisition"}</button>
        </div>}
    </div>
  );
}
