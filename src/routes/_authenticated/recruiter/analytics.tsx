import { createFileRoute } from "@tanstack/react-router";
import { RecruiterAnalyticsPage } from "@/components/analytics/Analytics";

const t = "Analytics — Sundance Professionals";
const d = "Measure your hiring funnel, job performance and candidate quality.";
export const Route = createFileRoute("/_authenticated/recruiter/analytics")({
  head: () => ({ meta: [{ title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <RecruiterAnalyticsPage uid={account.userId} />;
}
