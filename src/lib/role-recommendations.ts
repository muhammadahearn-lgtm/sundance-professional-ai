/** Role-aware recommendations. Only affect ordering/visibility of pickers — never restrict choices or feed scoring. */
import { taxonomyKey } from "./taxonomy";

export type RecKind = "language" | "skill" | "technology" | "soft_skill";
type Rec = Record<RecKind, string[]>;

const MAP: Record<string, Rec> = {
  "data engineer": {
    language: ["Python", "SQL", "Scala", "Java", "Go"],
    skill: ["Data Engineering", "ETL Development", "Data Modeling", "Data Warehousing", "Database Design"],
    technology: ["Snowflake", "Databricks", "AWS", "Kafka", "Airflow"],
    soft_skill: ["Problem Solving", "Communication", "Collaboration", "Attention To Detail"],
  },
  "data scientist": {
    language: ["Python", "SQL", "R", "Scala", "Julia"],
    skill: ["Machine Learning", "Statistical Analysis", "Predictive Modeling", "Data Modeling", "Feature Engineering"],
    technology: ["Snowflake", "Databricks", "Jupyter", "Tableau", "Power BI"],
    soft_skill: ["Critical Thinking", "Problem Solving", "Communication", "Collaboration"],
  },
  "ai engineer": {
    language: ["Python", "JavaScript", "TypeScript", "Go", "SQL"],
    skill: ["Prompt Engineering", "Machine Learning", "Large Language Models", "Natural Language Processing", "APIs"],
    technology: ["OpenAI", "LangChain", "PyTorch", "AWS", "Docker"],
    soft_skill: ["Problem Solving", "Critical Thinking", "Communication", "Collaboration"],
  },
};

/** Recommended names for a role and category (empty when the role has no mapping). */
export function recommendationsFor(roleName: string | null | undefined, kind: RecKind): string[] {
  const k = (roleName ?? "").trim().toLowerCase();
  return MAP[k]?.[kind] ?? [];
}

/** Split options into recommended (in mapping order) and the rest (alphabetical). */
export function splitRecommended<T extends { name: string }>(opts: T[], recNames: string[]): { rec: T[]; rest: T[] } {
  const keys = recNames.map(taxonomyKey);
  const rec = keys.map((k) => opts.find((o) => taxonomyKey(o.name) === k)).filter((o): o is T => !!o);
  const ids = new Set(rec);
  const rest = opts.filter((o) => !ids.has(o)).sort((a, b) => a.name.localeCompare(b.name));
  return { rec, rest };
}
