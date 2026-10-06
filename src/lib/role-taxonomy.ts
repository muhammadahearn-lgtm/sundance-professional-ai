/** Controlled role/level taxonomy helpers. Custom titles are display-only. */
export type RoleOpt = { id: string; name: string; category?: string };
export type LevelOpt = { id: string; name: string };

/** Display title: custom title if present, otherwise "Level Role". */
export function displayJobTitle(customTitle: string | null | undefined, levelName?: string | null, roleName?: string | null): string {
  const c = (customTitle ?? "").trim();
  if (c) return c;
  return [levelName, roleName].filter((x) => x && x.trim()).join(" ").trim();
}

/** Reduce common job-title word variants to a shared stem (science/scientist, analytics/analyst, …). */
const STEMS: [RegExp, string][] = [
  [/^scien(ce|ces|tist|tists|tific)?$/, "scien"],
  [/^analy(tics|tic|tical|st|sts|sis|ze|zer)?$/, "analy"],
  [/^develop(er|ers|ment)?$/, "develop"],
  [/^engineer(s|ing)?$/, "engineer"],
  [/^admin(s|istrator|istrators|istration)?$/, "admin"],
  [/^manag(er|ers|ement|ing)?$/, "manag"],
  [/^architect(s|ure)?$/, "architect"],
  [/^consult(ant|ants|ing)?$/, "consult"],
  [/^test(er|ers|ing)?$/, "test"],
  [/^secur(e|ity)$/, "secur"],
];
function stem(w: string): string {
  for (const [re, s] of STEMS) if (re.test(w)) return s;
  return w;
}
const norm = (s: string) => s.toLowerCase().replace(/cyber\s+security/g, "cybersecurity").replace(/\bdev\s*ops\b/g, "devops");
const words = (s: string) => norm(s).split(/[\s&/,()-]+/).filter(Boolean);

/** Case-insensitive search across role name and category; prefix, then word-prefix, then stem matches rank first. */
export function searchOptions<T extends { name: string; category?: string }>(opts: T[], query: string): T[] {
  const q = norm(query.trim());
  if (!q) return opts;
  const qWords = words(q);
  const scored = opts
    .map((o) => {
      const n = norm(o.name);
      const nw = words(o.name);
      const nStems = nw.map(stem);
      // Every query word must prefix-match a name word (last word may be partial).
      const allPrefix = qWords.every((qw) => nw.some((w) => w.startsWith(qw)));
      const allStem = qWords.every((qw, i) => {
        const s = stem(qw);
        const partial = i === qWords.length - 1;
        return nStems.some((ns, j) => ns === s || (nw[j] ?? "").startsWith(qw) || (partial && qw.length >= 3 && (ns.startsWith(qw) || qw.startsWith(ns))));
      });
      const score = n.startsWith(q) ? 0 : allPrefix ? 1 : allStem ? 2 : n.includes(q) ? 3 : norm(o.category ?? "").includes(q) ? 4 : -1;
      return { o, score };
    })
    .filter((x) => x.score >= 0);
  return scored.sort((a, b) => a.score - b.score).map((x) => x.o);
}
