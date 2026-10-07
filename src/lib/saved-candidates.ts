/** Filtering/sorting rules for the recruiter's Saved Candidates page. Pure, client-side. */
export const UNASSIGNED = "__pool";
export type SavedSort = "recent" | "match" | "experience" | "name";
export const SAVED_SORTS: { value: SavedSort; label: string }[] = [
  { value: "recent", label: "Recently saved" },
  { value: "match", label: "Highest match" },
  { value: "experience", label: "Most experience" },
  { value: "name", label: "Name (A–Z)" },
];
export type SavedItem = { id: string; name: string; years: number; savedDate: string; jobId: string | null; companyId: string | null; score: number | null };

export function filterSaved(items: SavedItem[], f: { company: string; job: string; q?: string }) {
  const q = (f.q ?? "").trim().toLowerCase();
  return items.filter((i) => {
    if (f.job === UNASSIGNED) { if (i.jobId) return false; }
    else if (f.job && i.jobId !== f.job) return false;
    if (f.company && f.job !== UNASSIGNED && i.companyId !== f.company) return false;
    if (q && !i.name.toLowerCase().includes(q)) return false;
    return true;
  });
}

export function sortSaved(items: SavedItem[], sort: SavedSort) {
  const a = [...items];
  if (sort === "recent") a.sort((x, y) => y.savedDate.localeCompare(x.savedDate));
  if (sort === "match") a.sort((x, y) => (y.score ?? -1) - (x.score ?? -1) || y.savedDate.localeCompare(x.savedDate));
  if (sort === "experience") a.sort((x, y) => y.years - x.years);
  if (sort === "name") a.sort((x, y) => x.name.localeCompare(y.name));
  return a;
}

export type PickerJob = { job_id: string; job_title: string; job_status: string; company_id: string | null; company_name: string };
/** Job picker: filter by company + free text (title or company), group by company A–Z. */
export function groupPickerJobs(jobs: PickerJob[], opts: { company?: string; q?: string }) {
  const q = (opts.q ?? "").trim().toLowerCase();
  const hit = jobs.filter((j) => (!opts.company || j.company_id === opts.company) && (!q || `${j.job_title} ${j.company_name}`.toLowerCase().includes(q)));
  const m = new Map<string, PickerJob[]>();
  for (const j of hit) m.set(j.company_name, [...(m.get(j.company_name) ?? []), j]);
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([company, list]) => ({ company, jobs: list.sort((a, b) => a.job_title.localeCompare(b.job_title)) }));
}
/** AI top pick: the active job with the highest match score for this candidate; null when no scores. */
export function topPickJob(jobs: PickerJob[], scores: Record<string, number>) {
  let best: PickerJob | null = null;
  for (const j of jobs) if (j.job_status === "active" && scores[j.job_id] != null && (!best || scores[j.job_id]! > scores[best.job_id]!)) best = j;
  return best;
}
