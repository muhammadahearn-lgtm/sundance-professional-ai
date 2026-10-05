import { createFileRoute } from "@tanstack/react-router";
import { TalentSearchPage } from "@/components/talent/Talent";
import { DEFAULT_TALENT, type TalentFilters } from "@/lib/talent-rules";

const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 120) : "");
const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 30) : typeof v === "string" && v ? [v] : []);
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0; };

export const Route = createFileRoute("/_authenticated/recruiter/candidates/")({
  validateSearch: (s: Record<string, unknown>): Partial<TalentFilters> => {
    const full: TalentFilters = {
      q: str(s["q"]), role: str(s["role"]), level: str(s["level"]), exp: str(s["exp"]), loc: str(s["loc"]), country: str(s["country"]), state: str(s["state"]), city: str(s["city"]), sort: str(s["sort"]) || "match", co: str(s["co"]), job: str(s["job"]), deg: str(s["deg"]), fos: str(s["fos"]), grad: num(s["grad"]) || undefined,
      langs: arr(s["langs"]), skills: arr(s["skills"]), soft: arr(s["soft"]), techs: arr(s["techs"]), avail: arr(s["avail"]), arr: arr(s["arr"]), ind: arr(s["ind"]),
      smin: num(s["smin"]), smax: num(s["smax"]), page: num(s["page"]) || 1, mm: num(s["mm"]), remote: s["remote"] === true || s["remote"] === "true",
    };
    const o: Partial<TalentFilters> = {};
    for (const [k, v] of Object.entries(full)) { if (v === undefined) continue; const d = DEFAULT_TALENT[k as keyof TalentFilters] ?? ""; if (Array.isArray(v) ? v.length : v !== d) Object.assign(o, { [k]: v }); }
    return o;
  },
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Search Talent — Sundance Professionals" }, { name: "description", content: "Search candidates by role, skills, technologies and experience." }, { property: "og:title", content: "Search Talent — Sundance Professionals" }, { property: "og:description", content: "Search candidates by role, skills, technologies and experience." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <TalentSearchPage uid={account.userId} f={{ ...DEFAULT_TALENT, ...Route.useSearch() }} />;
}
