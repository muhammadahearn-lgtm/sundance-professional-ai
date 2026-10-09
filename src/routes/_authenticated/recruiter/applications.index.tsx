import { createFileRoute } from "@tanstack/react-router";
import { RecruiterApplicationsPage } from "@/components/applications/Applications";
import { ApplicationRequisitionHub } from "@/components/applications/ApplicationRequisitionHub";

type S = { job?: string; view?: string; q?: string; co?: string; status?: string };
const KEYS = ["job", "view", "q", "co", "status"] as const;

export const Route = createFileRoute("/_authenticated/recruiter/applications/")({
  staticData: { sitemap: false },
  validateSearch: (s: Record<string, unknown>): S => {
    const out: S = {};
    for (const k of KEYS) { const v = s[k]; if (typeof v === "string" && v) out[k] = v.slice(0, 100); }
    return out;
  },
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Applications — Sundance Professionals" }, { name: "description", content: "Review applications to your jobs." }, { property: "og:title", content: "Applications — Sundance Professionals" }, { property: "og:description", content: "Review applications to your jobs." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  const s = Route.useSearch();
  if (!s.job && s.view !== "stream") return <ApplicationRequisitionHub uid={account.userId} q={s.q ?? ""} co={s.co ?? ""} status={s.status ?? "active"} />;
  return <RecruiterApplicationsPage key={s.job ?? "stream"} uid={account.userId} job={s.job ?? ""} />;
}
