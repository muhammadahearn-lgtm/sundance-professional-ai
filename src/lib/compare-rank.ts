/** Picks the top item by match score; ties broken by the secondary value (higher wins). */
export function rankCompare<T extends { id: string; score: number | null | undefined; tie?: number | null | undefined }>(items: T[]) {
  const scored = items.filter((i) => i.score != null);
  const sorted = [...scored].sort((a, b) => Number(b.score) - Number(a.score) || Number(b.tie ?? 0) - Number(a.tie ?? 0));
  const ranks: Record<string, number> = {};
  sorted.forEach((i, n) => { ranks[i.id] = n + 1; });
  const top = sorted[0];
  const lead = top && sorted[1] ? Math.round(Number(top.score) - Number(sorted[1].score)) : null;
  return { top, ranks, lead };
}

/** Id of the item with the highest value (null if none have a value). */
export function bestBy<T>(items: T[], id: (t: T) => string, v: (t: T) => number | null | undefined) {
  let best: string | null = null, max = -Infinity;
  for (const t of items) { const x = v(t); if (x != null && x > max) { max = x; best = id(t); } }
  return best;
}
