import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Eye, MoreHorizontal, Pause, Pencil, Play, Rocket, RotateCcw, Trash2, XCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { allowedActions, canDelete, canEdit, nextStatus, type JobAction, type JobStatus } from "@/lib/job-rules";
import { deleteJob, duplicateJob, loadJob, setJobStatus, toForm } from "@/lib/jobs-data";
import { canPublish } from "@/lib/job-rules";
import { useRecalc } from "@/components/match/Match";
import { friendlyError } from "@/components/profile/parts";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const META: Record<JobAction, { label: string; ok: string; Icon: typeof Play }> = {
  publish: { label: "Publish", ok: "Job published", Icon: Rocket },
  pause: { label: "Pause", ok: "Job paused", Icon: Pause },
  resume: { label: "Resume", ok: "Job published", Icon: Play },
  close: { label: "Close", ok: "Job closed", Icon: XCircle },
  reopen: { label: "Re-open", ok: "Job re-opened and back on the job board", Icon: RotateCcw },
};

export function useJobActions(uid: string) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const recalc = useRecalc();
  const refresh = (id?: string) => Promise.all([qc.invalidateQueries({ queryKey: ["jobs"] }), id ? qc.invalidateQueries({ queryKey: ["job", id] }) : null]);
  return {
    status: async (id: string, a: JobAction) => {
      try {
        if (a === "publish") {
          const d = await loadJob(id);
          if (!d || !canPublish(toForm(d))) { toast.error("Publish validation failed. Finish the required fields first."); navigate({ to: "/recruiter/jobs/$id/edit", params: { id } }); return; }
        }
        await setJobStatus(id, nextStatus(a)); toast.success(META[a].ok); if (a === "publish" || a === "resume") recalc.mutate(id); await refresh(id); }
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
  const [confirm, setConfirm] = useState<"delete" | "close" | "reopen" | null>(null);
  const t = (s: string) => (compact ? <span className="sr-only sm:not-sr-only">{s}</span> : s);
  const deletable = canDelete(applications);
  return (
    <div className="flex flex-wrap gap-2">
      {compact ? (
        <>
          {canEdit(status)
            ? <button className={btn} onClick={() => navigate({ to: "/recruiter/jobs/$id/edit", params: { id } })}><Pencil className="h-4 w-4" />Edit</button>
            : <button className={btn} onClick={() => navigate({ to: "/recruiter/jobs/$id", params: { id } })}><Eye className="h-4 w-4" />View</button>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`${btn} px-2`} aria-label="More job actions"><MoreHorizontal className="h-4 w-4" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              {canEdit(status) && <DropdownMenuItem onSelect={() => navigate({ to: "/recruiter/jobs/$id", params: { id } })}><Eye className="h-4 w-4" />View job</DropdownMenuItem>}
              <DropdownMenuItem onSelect={() => a.duplicate(id)}><Copy className="h-4 w-4" />Duplicate job</DropdownMenuItem>
              {allowedActions(status).map((x) => {
                const { label, Icon } = META[x];
                return <DropdownMenuItem key={x} onSelect={() => (x === "close" || x === "reopen" ? setConfirm(x) : a.status(id, x))}><Icon className="h-4 w-4" />{label} job</DropdownMenuItem>;
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!deletable} onSelect={() => setConfirm("delete")} className="items-start text-destructive focus:text-destructive">
                <Trash2 className="mt-0.5 h-4 w-4" />
                <span className="flex flex-col">Delete job{!deletable && <span className="text-xs font-normal text-muted-foreground">Has applications — close it instead</span>}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      ) : (
        <>
      {canEdit(status) && <button className={btn} onClick={() => navigate({ to: "/recruiter/jobs/$id/edit", params: { id } })}><Pencil className="h-4 w-4" />{t("Edit")}</button>}
      <button className={btn} onClick={() => a.duplicate(id)}><Copy className="h-4 w-4" />{t("Duplicate")}</button>
      {allowedActions(status).map((x) => {
        const { label, Icon } = META[x];
        return <button key={x} className={x === "publish" || x === "resume" ? `${btn} border-primary text-primary` : btn} onClick={() => (x === "close" || x === "reopen" ? setConfirm(x) : a.status(id, x))}><Icon className="h-4 w-4" />{t(label)}</button>;
      })}
      {deletable && <button className={`${btn} hover:border-destructive hover:text-destructive`} onClick={() => setConfirm("delete")}><Trash2 className="h-4 w-4" />{t("Delete")}</button>}
        </>
      )}
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === "delete" ? "Delete this job?" : confirm === "reopen" ? "Re-open this job?" : "Close this job?"}</AlertDialogTitle>
            <AlertDialogDescription>{confirm === "delete" ? "This action cannot be undone." : confirm === "reopen" ? "The job goes back on the job board and the pipeline unlocks. Use this if a hire fell through: you can move the hired candidate out and bring back a runner-up from Not Moving Forward." : "Closed jobs are archived and become read-only. You can re-open it later if a hire falls through."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className={confirm === "reopen" ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"} onClick={() => (confirm === "delete" ? a.remove(id, onDeleted) : a.status(id, confirm === "reopen" ? "reopen" : "close"))}>{confirm === "delete" ? "Delete Job" : confirm === "reopen" ? "Re-open Job" : "Close Job"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
