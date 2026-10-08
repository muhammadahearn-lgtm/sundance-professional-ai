import { taxonomyKey } from "./taxonomy";

/** Common abbreviations, nicknames and misspellings → the canonical catalog name. Keys are matched via taxonomyKey. */
const RAW: Record<string, string[]> = {
  Excel: ["xl", "xls", "xlsx", "ms excel", "microsoft excel", "excell", "exel"],
  Kubernetes: ["k8s", "kube", "kubernates"],
  PostgreSQL: ["postgres", "postgre", "pgsql", "psql", "postgresql db"],
  React: ["reactjs", "react.js", "react js"],
  "Node.js": ["node", "nodejs", "node js"],
  "Vue.js": ["vue", "vuejs", "vue js"],
  "Next.js": ["next", "nextjs", "next js"],
  Angular: ["angularjs", "angular.js"],
  "Google Cloud Platform": ["gcp", "google cloud"],
  AWS: ["amazon web services", "amazon aws"],
  "Microsoft Azure": ["azure", "ms azure"],
  "Machine Learning": ["ml"],
  "Artificial Intelligence": ["ai"],
  "Natural Language Processing": ["nlp"],
  "Deep Learning": ["dl"],
  "Continuous Integration / Continuous Deployment": ["ci/cd", "cicd", "ci cd"],
  "CI/CD": ["cicd", "ci cd"],
  MongoDB: ["mongo", "mongo db"],
  MySQL: ["my sql"],
  "Microsoft SQL Server": ["mssql", "ms sql", "sql server"],
  TensorFlow: ["tf", "tensor flow"],
  PyTorch: ["torch", "py torch"],
  "scikit-learn": ["sklearn", "scikit learn", "scikit"],
  "Power BI": ["powerbi", "power-bi", "pbi"],
  Tableau: ["tableu", "tablaeu"],
  GitHub: ["github.com", "git hub"],
  GitLab: ["git lab"],
  Docker: ["dockr", "docker engine"],
  Jira: ["jira software", "atlassian jira"],
  Figma: ["figma design"],
  "Google Analytics": ["ga", "ga4"],
  Salesforce: ["sfdc", "sales force"],
  JavaScript: ["js", "java script"],
  TypeScript: ["ts", "type script"],
  GraphQL: ["graph ql"],
  "REST APIs": ["rest", "rest api", "restful", "restful api"],
  Terraform: ["tf cli"],
  "Microsoft Word": ["ms word", "word"],
  "Microsoft PowerPoint": ["powerpoint", "ppt", "ms powerpoint"],
  "Microsoft Office": ["ms office", "office 365", "o365", "microsoft 365", "m365"],
  "Google Sheets": ["gsheets", "google spreadsheets"],
  "Search Engine Optimization": ["seo"],
  "User Experience Design": ["ux", "ux design"],
  "User Interface Design": ["ui", "ui design"],
};

const MAP = new Map<string, string>();
for (const [canon, aliases] of Object.entries(RAW)) for (const a of aliases) if (!MAP.has(taxonomyKey(a))) MAP.set(taxonomyKey(a), canon);

/** Canonical name for a known alias, or null. */
export function resolveAlias(input: string): string | null {
  return MAP.get(taxonomyKey(input)) ?? null;
}

/** All aliases that point at a canonical name (for search matching). */
export function aliasesFor(name: string): string[] {
  return RAW[name] ?? [];
}

/** True when an option should show for the query: substring on name/group, or the query is one of its aliases. */
export function optionMatches(o: { name: string; group?: string | undefined }, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  if (o.name.toLowerCase().includes(s) || (o.group ?? "").toLowerCase().includes(s)) return true;
  const canon = resolveAlias(q);
  return !!canon && taxonomyKey(canon) === taxonomyKey(o.name);
}

function lev(a: string, b: string): number {
  // Optimal string alignment distance: swapped neighbours (dokcer → docker) count as one edit.
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    const c = a[i - 1] === b[j - 1] ? 0 : 1;
    d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + c);
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1);
  }
  return d[a.length]![b.length]!;
}

/** Closest existing option to a likely typo (1 edit for short words, 2 for 7+ chars), or null. */
export function closeMatch<T extends { name: string }>(input: string, options: T[]): T | null {
  const k = taxonomyKey(input).replace(/_/g, "");
  if (k.length < 4) return null;
  const max = k.length >= 7 ? 2 : 1;
  let best: T | null = null, bestD = max + 1;
  for (const o of options) {
    const ok = taxonomyKey(o.name).replace(/_/g, "");
    if (Math.abs(ok.length - k.length) > max) continue;
    const dist = lev(k, ok);
    if (dist > 0 && dist < bestD) { best = o; bestD = dist; }
  }
  return best;
}
