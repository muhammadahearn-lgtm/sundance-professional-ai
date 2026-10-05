import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Copy, Pencil, Rocket, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useJobActions } from "./JobActions";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Draft = { job_id: string; job_title: string; job_status: string; updated_at: string; completion_percent: number; applications: number };

export function relativeTime(iso: string, now = new Date()) {
  const mins = Math.floor((now.getTime() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

const btn = "inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:border-primary hover:text-primary";

export function DraftJobsWidget({ uid, jobs, onChange }: { uid: string; jobs: Draft[]; onChange: () => void }) {
  const drafts = jobs.filter((j) => j.job_status === "draft").sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const a = useJobActions(uid);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [del, setDel] = useState<string | null>(null);
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-base font-bold">Draft Jobs</h2>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{drafts.length} Draft{drafts.length === 1 ? "" : "s"}</span>
      </div>
      {drafts.length === 0 ? <p className="text-sm text-muted-foreground">No unfinished drafts. Jobs you save for later appear here.</p> : (
        <ul className="space-y-2">{drafts.slice(0, 5).map((d) => (
          <li key={d.job_id} className="rounded-xl border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link to="/recruiter/jobs/$id/edit" params={{ id: d.job_id }} className="block truncate font-semibold hover:text-primary">{d.job_title}</Link>
                <p className="text-xs text-muted-foreground">Last updated: {relativeTime(d.updated_at)}</p>
              </div>
              <span className="shrink-0 text-xs font-semibold">{d.completion_percent}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${d.completion_percent}%` }} /></div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button className={`${btn} border-primary text-primary`} onClick={() => navigate({ to: "/recruiter/jobs/$id/edit", params: { id: d.job_id } })}><Pencil className="h-3.5 w-3.5" />Continue Editing</button>
              <button className={btn} onClick={async () => { await a.status(d.job_id, "publish"); onChange(); }}><Rocket className="h-3.5 w-3.5" />Publish</button>
              <button className={btn} onClick={() => a.duplicate(d.job_id)}><Copy className="h-3.5 w-3.5" />Duplicate</button>
              <button className={`${btn} hover:border-destructive hover:text-destructive`} onClick={() => setDel(d.job_id)}><Trash2 className="h-3.5 w-3.5" />Delete</button>
            </div>
          </li>
        ))}</ul>
      )}
      {drafts.length > 5 && <Link to="/recruiter/jobs" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">View all drafts</Link>}
      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Draft?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => del && a.remove(del, () => { qc.invalidateQueries({ queryKey: ["recruiter-dashboard"] }); onChange(); })}>Delete Draft</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
