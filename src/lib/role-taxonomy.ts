/** Controlled role/level taxonomy helpers. Custom titles are display-only. */
export type RoleOpt = { id: string; name: string; category?: string };
export type LevelOpt = { id: string; name: string };

/** Display title: custom title if present, otherwise "Level Role". */
export function displayJobTitle(customTitle: string | null | undefined, levelName?: string | null, roleName?: string | null): string {
  const c = (customTitle ?? "").trim();
  if (c) return c;
  return [levelName, roleName].filter((x) => x && x.trim()).join(" ").trim();
}

/** Case-insensitive search across role name and category; word-prefix matches rank first. */
export function searchOptions<T extends { name: string; category?: string }>(opts: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return opts;
  const scored = opts
    .map((o) => {
      const n = o.name.toLowerCase();
      const words = n.split(/[\s&/-]+/);
      const score = n.startsWith(q) ? 0 : words.some((w) => w.startsWith(q)) ? 1 : n.includes(q) ? 2 : (o.category ?? "").toLowerCase().includes(q) ? 3 : -1;
      return { o, score };
    })
    .filter((x) => x.score >= 0);
  return scored.sort((a, b) => a.score - b.score).map((x) => x.o);
}
