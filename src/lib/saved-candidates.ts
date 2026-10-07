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
