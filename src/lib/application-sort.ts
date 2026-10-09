export const APP_SORTS: [string, string][] = [["match", "Highest Match Score"], ["match_low", "Lowest Match Score"], ["experience", "Most Experienced"], ["newest", "Newest Applied"], ["oldest", "Oldest Applied"]];

/** Sorts applications; unscored rows always go last, ties broken by newest application. */
export function sortApplications<T extends { application_date: string }>(rows: T[], sort: string, score: (r: T) => number | null | undefined, years?: (r: T) => number | null | undefined): T[] {
  const byDate = (a: T, b: T) => b.application_date.localeCompare(a.application_date);
  if (sort === "newest") return [...rows].sort(byDate);
  if (sort === "oldest") return [...rows].sort((a, b) => -byDate(a, b));
  if (sort === "experience") {
    const yrs = years ?? (() => 0);
    return [...rows].sort((a, b) => (yrs(b) ?? 0) - (yrs(a) ?? 0) || byDate(a, b));
  }
  const dir = sort === "match_low" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = score(a), y = score(b);
    if (x == null && y == null) return byDate(a, b);
    if (x == null) return 1;
    if (y == null) return -1;
    return (x - y) * dir || byDate(a, b);
  });
}
