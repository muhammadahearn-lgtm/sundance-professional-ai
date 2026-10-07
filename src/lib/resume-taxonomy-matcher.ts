// Maps AI-parsed resume values onto Sundance's governed catalogs.
// Pure + client-side: catalogs are passed in, nothing is written here.
import type { ParsedResume } from "./resume-parse";
import { searchOptions } from "./role-taxonomy";
import { exactCatalogMatch, type CatalogCert } from "./certifications";
import type { DegreeType } from "./education";

export type Opt = { id: string; name: string };
export type Kind = "language" | "skill" | "technology" | "soft_skill";
export type Catalogs = {
  languages: Opt[]; skills: Opt[]; technologies: Opt[]; softSkills: Opt[];
  roles: Opt[]; certifications: CatalogCert[]; countries: string[];
};
export type MatchedItem = Opt & { kind: Kind; source: string };
export type Unmatched = { kind: Kind; name: string };

/** Common spellings that differ from the catalog name beyond case/punctuation. */
const ALIASES: Record<string, string> = {
  js: "javascript", ecmascript: "javascript", es6: "javascript", ts: "typescript",
  golang: "go", py: "python", python3: "python", "c sharp": "c#", csharp: "c#", cpp: "c++", "c plus plus": "c++",
  "react native": "react native", reactjs: "react", "react js": "react", nodejs: "node.js", node: "node.js", "node js": "node.js",
  vuejs: "vue.js", vue: "vue.js", nextjs: "next.js", next: "next.js", nuxtjs: "nuxt.js", expressjs: "express", angularjs: "angular",
  "amazon web services": "aws", "google cloud platform": "google cloud", gcp: "google cloud", "microsoft azure": "azure",
  k8s: "kubernetes", postgres: "postgresql", "postgre sql": "postgresql", mongo: "mongodb", "ms sql": "sql server", mssql: "sql server",
  "apache spark": "spark", pyspark: "spark", "apache kafka": "kafka", "apache airflow": "airflow", tf: "terraform",
  "github actions": "github actions", "ci cd": "ci/cd", cicd: "ci/cd", ml: "machine learning", ai: "artificial intelligence",
  nlp: "natural language processing", "rest api": "rest apis", restful: "rest apis", "restful apis": "rest apis",
  "power bi": "power bi", powerbi: "power bi", sklearn: "scikit-learn", "scikit learn": "scikit-learn",
};

/** Loose comparison key: lowercase, punctuation → space, drop trailing ".js"/"js" handled via aliases. */
export function looseKey(v: string): string {
  return (v ?? "").toLowerCase().replace(/[^a-z0-9#+./]+/g, " ").replace(/\s+/g, " ").trim();
}
const compact = (v: string) => looseKey(v).replace(/[\s.\-/]+/g, "");

function buildIndex(opts: Opt[]) {
  const byKey = new Map<string, Opt>(); const byCompact = new Map<string, Opt>();
  for (const o of opts) { byKey.set(looseKey(o.name), o); byCompact.set(compact(o.name), o); }
  return (raw: string): Opt | undefined => {
    const k = looseKey(raw); if (!k) return undefined;
    const alias = ALIASES[k] ?? ALIASES[compact(raw)];
    return byKey.get(k) ?? (alias ? byKey.get(alias) ?? byCompact.get(compact(alias)) : undefined) ?? byCompact.get(compact(raw))
      ?? (k.endsWith(" js") || k.endsWith("js") ? byCompact.get(compact(k.replace(/\.?\s?js$/, ""))) : undefined);
  };
}

export type MatchedResume = {
  languages: MatchedItem[]; skills: MatchedItem[]; technologies: MatchedItem[]; softSkills: MatchedItem[];
  unmatched: Unmatched[];
  currentRole: Opt | null; targetRoles: Opt[];
  certifications: { name: string; issuer: string; issue_date: string | null; catalog: CatalogCert | null }[];
  education: (ParsedResume["education"][number] & { degree_type: DegreeType | null })[];
  country: string; // governed country name or ""
};

const COUNTRY_CODES: Record<string, string[]> = {
  US: ["United States", "United States of America", "USA"], GB: ["United Kingdom", "UK"], CA: ["Canada"], AU: ["Australia"], IN: ["India"],
  DE: ["Germany"], FR: ["France"], NL: ["Netherlands"], IE: ["Ireland"], ES: ["Spain"], IT: ["Italy"], PK: ["Pakistan"], AE: ["United Arab Emirates", "UAE"],
  SG: ["Singapore"], BR: ["Brazil"], MX: ["Mexico"], NG: ["Nigeria"], ZA: ["South Africa"], PL: ["Poland"], SE: ["Sweden"], CH: ["Switzerland"],
  PH: ["Philippines"], EG: ["Egypt"], SA: ["Saudi Arabia"], JP: ["Japan"], CN: ["China"], KR: ["South Korea"], IL: ["Israel"], NZ: ["New Zealand"],
  PT: ["Portugal"], AR: ["Argentina"], CO: ["Colombia"], UA: ["Ukraine"], RO: ["Romania"], TR: ["Turkey", "Türkiye"], BD: ["Bangladesh"], VN: ["Vietnam"],
};
export function matchCountry(code: string, countries: string[]): string {
  const names = COUNTRY_CODES[code.toUpperCase()] ?? [];
  const lower = new Map(countries.map((c) => [c.toLowerCase(), c]));
  for (const n of names) { const hit = lower.get(n.toLowerCase()); if (hit) return hit; }
  return "";
}

/** Map free-text degree ("B.S.", "MSc", "PhD") to the fixed degree list. */
export function degreeTypeFor(v: string): DegreeType | null {
  const s = v.toLowerCase().replace(/\./g, "");
  if (/\b(phd|doctor|doctorate|dphil|edd)\b/.test(s)) return "Doctorate (PhD)";
  if (/\b(jd|md|mbbs|dds|pharmd)\b/.test(s)) return "Professional Degree";
  if (/\b(master|masters|ms|msc|ma|mba|meng|mtech|mcs|mphil)\b/.test(s)) return "Master's Degree";
  if (/\b(bachelor|bachelors|bs|bsc|ba|beng|btech|bcs|bba|bse)\b/.test(s)) return "Bachelor's Degree";
  if (/\b(associate|associates|aa|as|aas)\b/.test(s)) return "Associate Degree";
  if (/\bbootcamp\b/.test(s)) return "Bootcamp";
  if (/\b(certificate|diploma program)\b/.test(s)) return "Certificate Program";
  if (/\b(high school|ged)\b/.test(s)) return "High School Diploma";
  return null;
}

const SENIORITY = /\b(senior|sr|junior|jr|lead|principal|staff|head of|chief|intern|associate|mid level|entry level|i{1,3}|iv)\b\.?/gi;
export function matchRole(title: string, roles: Opt[]): Opt | null {
  const t = title.replace(SENIORITY, " ").replace(/\s+/g, " ").trim();
  if (!t) return null;
  const exact = roles.find((r) => looseKey(r.name) === looseKey(t));
  return exact ?? searchOptions(roles, t)[0] ?? null;
}

/**
 * Match every parsed skill/tool/language against all four catalogs. An item found in a
 * different catalog than the AI guessed moves to the catalog where it exists (cross-category lock).
 */
export function matchResume(p: ParsedResume, c: Catalogs): MatchedResume {
  const idx: Record<Kind, (s: string) => Opt | undefined> = {
    language: buildIndex(c.languages), skill: buildIndex(c.skills), technology: buildIndex(c.technologies), soft_skill: buildIndex(c.softSkills),
  };
  const out: Record<Kind, MatchedItem[]> = { language: [], skill: [], technology: [], soft_skill: [] };
  const seen = new Set<string>(); const unmatched: Unmatched[] = []; const unseen = new Set<string>();
  const order: Record<Kind, Kind[]> = {
    language: ["language", "technology", "skill"], technology: ["technology", "language", "skill"],
    skill: ["skill", "technology", "language"], soft_skill: ["soft_skill"],
  };
  const take = (raw: string, guess: Kind) => {
    for (const k of order[guess]) {
      const hit = idx[k](raw);
      if (hit) { const key = `${k}:${hit.id}`; if (!seen.has(key)) { seen.add(key); out[k].push({ ...hit, kind: k, source: raw }); } return; }
    }
    // Languages are a fixed list: unknown "languages" are offered as technologies instead.
    const kind: Kind = guess === "language" ? "technology" : guess;
    const uk = `${kind}:${looseKey(raw)}`;
    if (!unseen.has(uk)) { unseen.add(uk); unmatched.push({ kind, name: raw }); }
  };
  p.programming_languages.forEach((s) => take(s, "language"));
  p.tools.forEach((s) => take(s, "technology"));
  p.technical_skills.forEach((s) => take(s, "skill"));
  p.soft_skills.forEach((s) => take(s, "soft_skill"));
  // Technologies mentioned only inside work history still count as tools.
  p.experience.flatMap((e) => e.technologies_used).forEach((s) => { if (idx.technology(s) || idx.language(s)) take(s, "technology"); });

  const targets: Opt[] = [];
  for (const t of p.target_roles) { const r = matchRole(t, c.roles); if (r && !targets.some((x) => x.id === r.id)) targets.push(r); }

  return {
    languages: out.language, skills: out.skill, technologies: out.technology, softSkills: out.soft_skill, unmatched,
    currentRole: matchRole(p.job_title, c.roles), targetRoles: targets.slice(0, 3),
    certifications: p.certifications.map((x) => {
      const cat = exactCatalogMatch(c.certifications, x.certification_name) ?? null;
      return { name: cat?.name ?? x.certification_name, issuer: cat?.issuer ?? x.issuing_organization, issue_date: x.issue_date, catalog: cat };
    }),
    education: p.education.map((e) => ({ ...e, degree_type: degreeTypeFor(e.degree) })),
    country: matchCountry(p.location_country, c.countries),
  };
}
