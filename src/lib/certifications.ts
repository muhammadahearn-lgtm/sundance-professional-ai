import { taxonomyDisplay } from "./taxonomy";

export type CatalogCert = { catalog_id: string; name: string; abbreviation: string; issuer: string; category: string; aliases: string[] };

const STOP = new Set(["the", "of", "and", "in", "for", "a", "an"]);
const tokens = (v: string) => (v ?? "").toLowerCase().replace(/[^a-z0-9+#]+/g, " ").split(/\s+/).filter((t) => t && !STOP.has(t));

/** Mirrors DB cert_key: lowercase, punctuation-free, plural-trimmed, word-order independent. */
export function certKey(v: string): string {
  const ws = new Set(tokens(v).map((t) => (t.length > 3 && /[^s]s$/.test(t) ? t.slice(0, -1) : t)));
  return [...ws].sort().join(" ");
}

/** Custom names: trimmed, single-spaced Title Case (mirrors DB trigger). */
export const normalizeCertName = (v: string) => taxonomyDisplay(v);

const stem = (t: string) => t.slice(0, 5);
function overlap(a: string, b: string): number {
  const A = new Set(tokens(a).map(stem)), B = new Set(tokens(b).map(stem));
  if (!A.size || !B.size) return 0;
  let n = 0; for (const x of A) if (B.has(x)) n++;
  return n / Math.max(A.size, B.size);
}

/** Exact catalog hit by name, abbreviation or alias, ignoring case, spacing and word order. */
export function exactCatalogMatch(list: CatalogCert[], input: string): CatalogCert | undefined {
  const k = certKey(input);
  if (!k) return undefined;
  return list.find((c) => certKey(c.name) === k || (c.abbreviation && certKey(c.abbreviation) === k) || c.aliases.some((a) => certKey(a) === k));
}

/** Ranked catalog suggestions: abbreviation/prefix/substring hits, then reordered or close wording. */
export function searchCatalog(list: CatalogCert[], input: string, limit = 8): CatalogCert[] {
  const q = input.trim().toLowerCase();
  if (!q) return [];
  const scored: { c: CatalogCert; s: number }[] = [];
  for (const c of list) {
    const names = [c.name, ...c.aliases];
    let s = 0;
    if (c.abbreviation && c.abbreviation.toLowerCase() === q) s = 100;
    else if (names.some((n) => certKey(n) === certKey(q))) s = 95;
    else if (names.some((n) => n.toLowerCase().includes(q)) || c.abbreviation.toLowerCase().startsWith(q)) s = 80;
    else if (c.issuer.toLowerCase().includes(q)) s = 50;
    else { const o = Math.max(...names.map((n) => overlap(n, q))); if (o >= 0.6) s = 40 + o * 30; }
    if (s) scored.push({ c, s });
  }
  return scored.sort((a, b) => b.s - a.s || a.c.name.localeCompare(b.c.name)).slice(0, limit).map((x) => x.c);
}

export const catalogLabel = (c: CatalogCert) => (c.abbreviation && !c.name.includes(c.abbreviation) ? `${c.name} (${c.abbreviation})` : c.name);
