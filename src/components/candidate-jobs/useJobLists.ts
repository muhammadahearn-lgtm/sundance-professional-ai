import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listCompareIds, listSavedIds, setCompared, setSaved } from "@/lib/job-search-data";
import { COMPARE_MAX, canAddToCompare } from "@/lib/job-search";
import { friendlyError } from "@/components/profile/parts";

export function useJobLists(uid: string) {
  const qc = useQueryClient();
  const saved = useQuery({ queryKey: ["saved-jobs", uid], queryFn: () => listSavedIds(uid) });
  const compare = useQuery({ queryKey: ["compare-jobs", uid], queryFn: () => listCompareIds(uid) });
  const savedIds = saved.data ?? [], compareIds = compare.data ?? [];
  return {
    savedIds, compareIds,
    isSaved: (id: string) => savedIds.includes(id),
    isCompared: (id: string) => compareIds.includes(id),
    toggleSave: async (id: string) => {
      const on = !savedIds.includes(id);
      qc.setQueryData<string[]>(["saved-jobs", uid], (p = []) => (on ? [id, ...p] : p.filter((x) => x !== id)));
      try { await setSaved(uid, id, on); toast.success(on ? "Job saved" : "Job removed"); }
      catch (e) { toast.error(friendlyError(e, "Couldn't update saved jobs.")); }
      await qc.invalidateQueries({ queryKey: ["saved-jobs", uid] });
    },
    toggleCompare: async (id: string) => {
      const on = !compareIds.includes(id);
      if (on && !canAddToCompare(compareIds.length)) { toast.error(`You can compare up to ${COMPARE_MAX} jobs. Remove one first.`); return; }
      qc.setQueryData<string[]>(["compare-jobs", uid], (p = []) => (on ? [...p, id] : p.filter((x) => x !== id)));
      try { await setCompared(uid, id, on); toast.success(on ? "Job added to comparison" : "Removed from comparison"); }
      catch (e) { toast.error(friendlyError(e, "Couldn't update comparison.")); }
      await qc.invalidateQueries({ queryKey: ["compare-jobs", uid] });
    },
  };
}
export type JobLists = ReturnType<typeof useJobLists>;

export async function shareJob(id: string, title: string) {
  const url = `${window.location.origin}/candidate/jobs/${id}`;
  try {
    if (navigator.share) { await navigator.share({ title, url }); return; }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  } catch { /* user cancelled */ }
}
