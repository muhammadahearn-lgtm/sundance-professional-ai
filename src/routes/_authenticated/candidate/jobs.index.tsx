import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { JobSearchPage } from "@/components/candidate-jobs/JobSearchPage";
import { DEFAULT_SEARCH, type SearchState } from "@/lib/job-search";

const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 120) : "");
const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 30) : typeof v === "string" && v ? [v] : []);
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0; };

export const Route = createFileRoute("/_authenticated/candidate/jobs/")({
  validateSearch: (s: Record<string, unknown>): Partial<SearchState> => {
    const out: Partial<SearchState> = {};
    for (const k of ["q", "role", "exp", "loc", "company", "sort"] as const) { const v = str(s[k]); if (v) out[k] = v; }
    for (const k of ["langs", "skills", "techs", "arr", "emp"] as const) { const v = arr(s[k]); if (v.length) out[k] = v; }
    for (const k of ["smin", "smax", "page", "mm"] as const) { const v = num(s[k]); if (v) out[k] = v; }
    return out;
  },
  head: () => ({ meta: [{ title: "Find Jobs — Sundance Professionals" }, { name: "description", content: "Search active jobs by role, skill, technology, salary and location." }, { property: "og:title", content: "Find Jobs — Sundance Professionals" }, { property: "og:description", content: "Search active jobs by role, skill, technology, salary and location." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  const raw = Route.useSearch();
  const navigate = useNavigate({ from: "/candidate/jobs/" });
  const search: SearchState = { ...DEFAULT_SEARCH, ...raw };
  const setSearch = (patch: Partial<SearchState>) => {
    const next = { ...search, ...patch };
    const clean: Partial<SearchState> = {};
    (Object.keys(next) as (keyof SearchState)[]).forEach((k) => {
      const v = next[k], d = DEFAULT_SEARCH[k];
      if (Array.isArray(v) ? v.length : v !== d) (clean as Record<string, unknown>)[k] = v;
    });
    navigate({ search: clean, replace: true });
  };
  return <JobSearchPage account={account} search={search} setSearch={setSearch} />;
}
