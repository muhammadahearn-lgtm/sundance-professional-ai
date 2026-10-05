/** Mirrors the database taxonomy_display/taxonomy_key functions. */
export function taxonomyDisplay(v: string): string {
  const s = (v ?? "").trim().replace(/\s+/g, " ");
  const allUpper = s === s.toUpperCase() && s !== s.toLowerCase() && s.includes(" ");
  return s.split(" ").map((w) => (w === w.toLowerCase() || allUpper ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w)).join(" ");
}

export function taxonomyKey(v: string): string {
  return (v ?? "").trim().toLowerCase().replace(/[^a-z0-9#+.]+/g, "_").replace(/^_+|_+$/g, "");
}

/** Find an existing entry by normalized key so duplicates are reused. */
export function findExisting<T>(items: T[], name: (t: T) => string, input: string): T | undefined {
  const k = taxonomyKey(input);
  return items.find((i) => taxonomyKey(name(i)) === k);
}
