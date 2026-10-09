import { createFileRoute } from "@tanstack/react-router";
import { RequisitionHub } from "@/components/applications/RequisitionHub";

const str = (v: unknown) => (typeof v === "string" ? v : "");

export const Route = createFileRoute("/_authenticated/recruiter/pipeline/")({
  staticData: { sitemap: false },
  validateSearch: (s: Record<string, unknown>): { q?: string; co?: string; status?: string } => {
    const out: { q?: string; co?: string; status?: string } = {};
    if (str(s["q"])) out.q = str(s["q"]).slice(0, 100);
    if (str(s["co"])) out.co = str(s["co"]);
    if (str(s["status"])) out.status = str(s["status"]);
    return out;
  },
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Hiring Pipelines — Sundance Professionals" }, { name: "description", content: "All your job requisitions at a glance — open any job's hiring board." }, { property: "og:title", content: "Hiring Pipelines — Sundance Professionals" }, { property: "og:description", content: "All your job requisitions at a glance — open any job's hiring board." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  const { q = "", co = "", status = "active" } = Route.useSearch();
  return <RequisitionHub uid={account.userId} q={q} co={co} status={status} />;
}
