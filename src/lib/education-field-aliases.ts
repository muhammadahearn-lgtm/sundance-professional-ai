import { taxonomyKey } from "./taxonomy";

/** Common major abbreviations → canonical field of study. Keys matched via taxonomyKey. */
const RAW: Record<string, string[]> = {
  "Computer Science": ["cs", "comp sci", "compsci", "cse"],
  "Information Technology": ["it", "info tech"],
  "Information Systems": ["is", "mis", "cis", "management information systems"],
  "Electrical Engineering": ["ee", "ece", "electrical eng"],
  "Mechanical Engineering": ["me", "mech eng", "mechanical eng"],
  "Civil Engineering": ["civil eng"],
  "Chemical Engineering": ["chem eng", "cheme"],
  "Industrial Engineering": ["ie", "industrial eng"],
  "Data Science": ["ds", "data sci"],
  "Artificial Intelligence": ["ai"],
  "Software Engineering": ["se", "soft eng", "software eng"],
  "Cybersecurity": ["cyber", "cyber security", "infosec", "information security"],
  "Statistics": ["stats", "stat"],
  "Mathematics": ["math", "maths"],
  "Economics": ["econ"],
  "Business Administration": ["business admin", "biz admin", "bba", "mba"],
  "Accounting": ["acct", "accountancy"],
  "Human-Computer Interaction": ["hci"],
  "Biology": ["bio"],
  "Chemistry": ["chem"],
  "Physics": ["phys"],
  "Psychology": ["psych"],
  "Political Science": ["poli sci", "polisci"],
};

const MAP = new Map<string, string>();
for (const [canon, aliases] of Object.entries(RAW)) for (const a of aliases) if (!MAP.has(taxonomyKey(a))) MAP.set(taxonomyKey(a), canon);

export const KNOWN_FIELDS = Object.keys(RAW);

/** Canonical field of study for a known abbreviation, or null. */
export function resolveFieldOfStudy(input: string): string | null {
  return MAP.get(taxonomyKey(input)) ?? null;
}
