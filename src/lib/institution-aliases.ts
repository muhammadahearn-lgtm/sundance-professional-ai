import { taxonomyKey } from "./taxonomy";

/** Well-known institutions → acronyms/nicknames. Keys are matched via taxonomyKey. */
const RAW: Record<string, string[]> = {
  "Massachusetts Institute Of Technology": ["mit"],
  "Carnegie Mellon University": ["cmu", "carnegie mellon"],
  "University Of California, Los Angeles": ["ucla"],
  "University Of California, Berkeley": ["uc berkeley", "ucb", "berkeley", "cal"],
  "University Of California, San Diego": ["ucsd"],
  "University Of Southern California": ["usc"],
  "California Institute Of Technology": ["caltech"],
  "Stanford University": ["stanford"],
  "Harvard University": ["harvard"],
  "New York University": ["nyu"],
  "Georgia Institute Of Technology": ["georgia tech", "gatech", "gt"],
  "University Of Illinois Urbana-Champaign": ["uiuc", "illinois"],
  "University Of Washington": ["uw", "udub"],
  "University Of Michigan": ["umich"],
  "University Of Texas At Austin": ["ut austin", "uta"],
  "University Of Pennsylvania": ["upenn", "penn"],
  "Pennsylvania State University": ["penn state", "psu"],
  "Columbia University": ["columbia"],
  "Cornell University": ["cornell"],
  "Princeton University": ["princeton"],
  "Yale University": ["yale"],
  "University Of New Hampshire": ["unh"],
  "Boston University": ["bu"],
  "Northeastern University": ["neu"],
  "Arizona State University": ["asu"],
  "University Of Oxford": ["oxford"],
  "University Of Cambridge": ["cambridge"],
  "Imperial College London": ["imperial", "icl"],
  "University College London": ["ucl"],
  "London School Of Economics": ["lse"],
  "University Of Toronto": ["uoft", "u of t"],
  "University Of Waterloo": ["waterloo", "uwaterloo"],
  "National University Of Singapore": ["nus"],
  "Nanyang Technological University": ["ntu"],
  "Indian Institute Of Technology Bombay": ["iit bombay", "iitb"],
  "Indian Institute Of Technology Delhi": ["iit delhi", "iitd"],
  "Universitas Indonesia": ["ui", "university of indonesia"],
  "Institut Teknologi Bandung": ["itb", "bandung institute of technology"],
  "Universitas Gadjah Mada": ["ugm", "gadjah mada"],
  "ETH Zurich": ["eth", "swiss federal institute of technology"],
};

const MAP = new Map<string, string>();
for (const [canon, aliases] of Object.entries(RAW)) for (const a of aliases) if (!MAP.has(taxonomyKey(a))) MAP.set(taxonomyKey(a), canon);

export const KNOWN_INSTITUTIONS = Object.keys(RAW);

/** Canonical institution name for a known acronym/nickname, or null. */
export function resolveInstitution(input: string): string | null {
  return MAP.get(taxonomyKey(input)) ?? null;
}
