/** Role-aware recommendations. Only affect ordering/visibility of pickers — never restrict choices or feed scoring. */
import { taxonomyKey } from "./taxonomy";

export type RecKind = "language" | "skill" | "technology" | "soft_skill";
type Rec = Record<RecKind, string[]>;

const SOFT_ENG = ["Problem Solving", "Collaboration", "Communication", "Ownership"];
const r = (language: string[], skill: string[], technology: string[], soft_skill = SOFT_ENG): Rec => ({ language, skill, technology, soft_skill });

const FRONTEND = r(["TypeScript", "JavaScript", "HTML", "CSS"], ["Frontend Development", "Responsive Design", "Accessibility (WCAG)", "Performance Optimization", "Unit Testing"], ["React", "Next.js", "Tailwind CSS", "Vite", "Jest"], ["Attention To Detail", "Collaboration", "Communication", "Creativity"]);
const BACKEND = r(["Go", "Python", "Java", "SQL"], ["Backend Development", "RESTful API Design", "Microservices Architecture", "Database Design", "Distributed Systems"], ["PostgreSQL", "Redis", "Docker", "AWS", "Apache Kafka"]);
const FULLSTACK = r(["TypeScript", "JavaScript", "Python", "SQL"], ["Full Stack Development", "RESTful API Design", "Frontend Development", "Database Design", "System Design"], ["React", "Node.js", "Next.js", "PostgreSQL", "Docker"]);
const DEVOPS = r(["Bash", "Python", "Go", "HCL"], ["CI/CD", "Infrastructure As Code", "Containerization", "Automation", "DevOps"], ["Terraform", "Kubernetes", "Docker", "AWS", "GitHub Actions"]);
const SRE = r(["Go", "Python", "Bash"], ["Site Reliability Engineering", "Monitoring And Observability", "Incident Response", "Capacity Planning", "Distributed Systems"], ["Kubernetes", "Prometheus", "Grafana", "Terraform", "PagerDuty"], ["Problem Solving", "Ownership", "Stress Management", "Communication"]);
const CLOUD = r(["Python", "Bash", "HCL"], ["Cloud Architecture", "Cloud Security", "Infrastructure As Code", "Computer Networking", "Cloud Migration"], ["AWS", "Azure", "GCP", "Terraform", "Kubernetes"]);
const SECURITY = r(["Python", "Bash", "PowerShell"], ["Cybersecurity", "Threat Modeling", "Vulnerability Management", "Incident Response", "Identity And Access Management"], ["Splunk", "Wireshark", "Microsoft Sentinel", "CrowdStrike Falcon", "Burp Suite"], ["Attention To Detail", "Critical Thinking", "Problem Solving", "Communication"]);
const ML = r(["Python", "SQL", "C++"], ["Machine Learning", "Deep Learning", "Model Deployment", "MLOps", "Feature Engineering"], ["PyTorch", "TensorFlow", "MLflow", "Docker", "Amazon SageMaker"], ["Critical Thinking", "Problem Solving", "Curiosity", "Collaboration"]);
const MOBILE = r(["Swift", "Kotlin", "TypeScript", "Dart"], ["Mobile App Development", "iOS Development", "Android Development", "Performance Optimization", "Unit Testing"], ["React Native", "SwiftUI", "Jetpack Compose", "Xcode", "Android Studio"]);
const QA = r(["Python", "TypeScript", "Java"], ["Test Automation", "Quality Assurance", "Integration Testing", "CI/CD", "Unit Testing"], ["Playwright", "Cypress", "Selenium", "Postman", "Jest"], ["Attention To Detail", "Communication", "Problem Solving", "Collaboration"]);

const MAP: Record<string, Rec> = {
  "data engineer": {
    language: ["Python", "SQL", "Scala", "Java", "Go"],
    skill: ["Data Engineering", "ETL Development", "Data Modeling", "Data Warehousing", "Data Pipelines"],
    technology: ["Snowflake", "Databricks", "AWS", "Apache Kafka", "Apache Airflow", "Dbt"],
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
    skill: ["Prompt Engineering", "Machine Learning", "Large Language Models", "Retrieval-Augmented Generation", "AI Agents"],
    technology: ["OpenAI", "LangChain", "PyTorch", "AWS", "Docker"],
    soft_skill: ["Problem Solving", "Critical Thinking", "Communication", "Collaboration"],
  },
  "frontend engineer": FRONTEND, "frontend architect": FRONTEND, "web developer": FRONTEND, "design systems engineer": FRONTEND,
  "backend engineer": BACKEND, "software engineer": BACKEND, "software architect": BACKEND, "application developer": BACKEND,
  "full stack engineer": FULLSTACK,
  "devops engineer": DEVOPS, "platform engineer": DEVOPS, "build engineer": DEVOPS, "release engineer": DEVOPS, "infrastructure engineer": DEVOPS,
  "site reliability engineer": SRE, "observability engineer": SRE,
  "cloud engineer": CLOUD, "cloud architect": CLOUD, "solutions architect": CLOUD,
  "cybersecurity engineer": SECURITY, "security analyst": SECURITY, "cloud security engineer": SECURITY, "application security engineer": SECURITY, "devsecops engineer": SECURITY, "penetration tester": SECURITY, "incident response analyst": SECURITY,
  "machine learning engineer": ML, "mlops engineer": ML, "deep learning engineer": ML, "applied scientist": ML,
  "mobile engineer": MOBILE, "ios engineer": MOBILE, "android engineer": MOBILE,
  "qa engineer": QA, "test automation engineer": QA, "sdet": QA, "quality assurance engineer": QA,
};

/** Recommended names for a role and category (empty when the role has no mapping). */
export function recommendationsFor(roleName: string | null | undefined, kind: RecKind): string[] {
  const k = (roleName ?? "").trim().toLowerCase();
  return MAP[k]?.[kind] ?? [];
}

/** Starter job description (markdown) for a role. Recruiters edit freely; never used in scoring. */
export function descriptionTemplate(roleName: string | null | undefined): string {
  const role = (roleName ?? "").trim();
  if (!role) return "";
  const skills = recommendationsFor(role, "skill").slice(0, 3);
  const tools = recommendationsFor(role, "technology").slice(0, 4);
  return [
    `## About the Role`,
    `We're hiring a ${role} to help us build and scale our products. You'll work closely with a cross-functional team and own meaningful work from day one.`,
    ``,
    `## What You'll Do`,
    `- Design, build and maintain high-quality solutions${skills.length ? ` across ${skills.join(", ")}` : ""}`,
    `- Collaborate with product, design and engineering partners to ship features`,
    `- Review work, share knowledge and raise the bar for the team`,
    `- Monitor, troubleshoot and continuously improve what you build`,
    ``,
    `## What You Bring`,
    `- Proven professional experience as a ${role} or in a similar role`,
    tools.length ? `- Hands-on experience with ${tools.join(", ")}` : `- Strong command of the core tools for this role`,
    `- Clear written and verbal communication`,
    ``,
    `## What We Offer`,
    `- Competitive salary and benefits`,
    `- Flexible work and time off`,
    `- Budget for learning and growth`,
  ].join("\n");
}

/** Split options into recommended (in mapping order) and the rest (alphabetical). */
export function splitRecommended<T extends { name: string }>(opts: T[], recNames: string[]): { rec: T[]; rest: T[] } {
  const keys = recNames.map(taxonomyKey);
  const rec = keys.map((k) => opts.find((o) => taxonomyKey(o.name) === k)).filter((o): o is T => !!o);
  const ids = new Set(rec);
  const rest = opts.filter((o) => !ids.has(o)).sort((a, b) => a.name.localeCompare(b.name));
  return { rec, rest };
}
