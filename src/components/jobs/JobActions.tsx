import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Eye, Pause, Pencil, Play, Rocket, Trash2, XCircle } from "lucide-react";
import { allowedActions, canDelete, canEdit, nextStatus, type JobAction, type JobStatus } from "@/lib/job-rules";
import { deleteJob, duplicateJob, setJobStatus } from "@/lib/jobs-data";
import { friendlyError } from "@/components/profile/parts";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const META: Record<JobAction, { label: string; ok: string; Icon: typeof Play }> = {
  publish: { label: "Publish", ok: "Job published", Icon: Rocket },
  pause: { label: "Pause", ok: "Job paused", Icon: Pause },
  resume: { label: "Resume", ok: "Job published", Icon: Play },
  close: { label: "Close", ok: "Job closed", Icon: XCircle },
};

export function useJobActions(uid: string) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const refresh = (id?: string) => Promise.all([qc.invalidateQueries({ queryKey: ["jobs"] }), id ? qc.invalidateQueries({ queryKey: ["job", id] }) : null]);
  return {
    status: async (id: string, a: JobAction) => {
      try { await setJobStatus(id, nextStatus(a)); toast.success(META[a].ok); await refresh(id); }
      catch (e) { toast.error(friendlyError(e, "Unable to save changes.")); }
    },
    duplicate: async (id: string) => {
      try { const nid = await duplicateJob(uid, id); toast.success("Job duplicated"); await refresh(); navigate({ to: "/recruiter/jobs/$id/edit", params: { id: nid } }); }
      catch (e) { toast.error(friendlyError(e, "Couldn't duplicate this job.")); }
    },
    remove: async (id: string, after?: () => void) => {
      try { await deleteJob(id); toast.success("Job deleted"); await refresh(); after?.(); }
      catch (e) { toast.error(e instanceof Error && /applications/.test(e.message) ? e.message : friendlyError(e, "Couldn't delete this job.")); }
    },
  };
}

const btn = "inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold hover:border-primary hover:text-primary";

export function JobActionBar({ uid, id, status, applications, compact, onDeleted }: { uid: string; id: string; status: JobStatus; applications: number; compact?: boolean; onDeleted?: () => void }) {
  const a = useJobActions(uid);
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState<"delete" | "close" | null>(null);
  const t = (s: string) => (compact ? <span className="sr-only sm:not-sr-only">{s}</span> : s);
  return (
    <div className="flex flex-wrap gap-2">
      {compact && <button className={btn} onClick={() => navigate({ to: "/recruiter/jobs/$id", params: { id } })}><Eye className="h-4 w-4" />{t("View")}</button>}
      {canEdit(status) && <button className={btn} onClick={() => navigate({ to: "/recruiter/jobs/$id/edit", params: { id } })}><Pencil className="h-4 w-4" />{t("Edit")}</button>}
      <button className={btn} onClick={() => a.duplicate(id)}><Copy className="h-4 w-4" />{t("Duplicate")}</button>
      {allowedActions(status).map((x) => {
        const { label, Icon } = META[x];
        return <button key={x} className={x === "publish" || x === "resume" ? `${btn} border-primary text-primary` : btn} onClick={() => (x === "close" ? setConfirm("close") : a.status(id, x))}><Icon className="h-4 w-4" />{t(label)}</button>;
      })}
      {canDelete(applications) && <button className={`${btn} hover:border-destructive hover:text-destructive`} onClick={() => setConfirm("delete")}><Trash2 className="h-4 w-4" />{t("Delete")}</button>}
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === "delete" ? "Delete this job?" : "Close this job?"}</AlertDialogTitle>
            <AlertDialogDescription>{confirm === "delete" ? "This action cannot be undone." : "Closed jobs are archived and become read-only. This cannot be reopened — you can duplicate it later."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => (confirm === "delete" ? a.remove(id, onDeleted) : a.status(id, "close"))}>{confirm === "delete" ? "Delete Job" : "Close Job"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
