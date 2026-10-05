/** Location governance helpers. Mirrors the database's location_normalize trigger. */
export type LocationParts = { country: string; state: string; city: string };

/** Trim, collapse spaces, Title Case. "  new   HAMPSHIRE " -> "New Hampshire". */
export function normalizeLocationPart(v: string): string {
  return v.trim().replace(/\s+/g, " ").toLowerCase().replace(/(^|[\s\-'.])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

/** Normalized key: "New Hampshire" -> "new_hampshire". */
export function locationKey(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

/** Display standard: "City, State / Province, Country" (empty parts skipped). */
export function formatLocation(p: Partial<LocationParts>): string {
  return [p.city, p.state, p.country].map((x) => normalizeLocationPart(x ?? "")).filter(Boolean).join(", ");
}

export function validateLocation(p: LocationParts, countries: string[]): string | null {
  if (!p.country || !countries.includes(p.country)) return "Pick a country from the list.";
  if (!normalizeLocationPart(p.state)) return "Enter a state or province.";
  if (!normalizeLocationPart(p.city)) return "Enter a city.";
  if (p.state.length > 80 || p.city.length > 80) return "Keep state and city under 80 characters.";
  return null;
}

export type LocationAlignment = "strong" | "partial" | "conflict";
export const ALIGNMENT_LABEL: Record<LocationAlignment, string> = { strong: "Strong Alignment", partial: "Partial Alignment", conflict: "Location Conflict" };

/** Informational only — never part of the match score. */
export function locationAlignment(candidate: Partial<LocationParts>, job: Partial<LocationParts>, jobArrangement: string, candidateArrangement = ""): LocationAlignment {
  const k = (v?: string) => locationKey(v ?? "");
  if (jobArrangement === "remote") return k(candidate.country) && k(job.country) && k(candidate.country) !== k(job.country) ? "partial" : "strong";
  if (k(candidate.city) && k(candidate.city) === k(job.city) && k(candidate.state) === k(job.state)) return "strong";
  if (k(candidate.state) && k(candidate.state) === k(job.state) && k(candidate.country) === k(job.country)) return "partial";
  if (candidateArrangement === "remote" && jobArrangement === "on_site") return "conflict";
  return k(candidate.country) && k(candidate.country) === k(job.country) && jobArrangement === "hybrid" ? "partial" : "conflict";
}
