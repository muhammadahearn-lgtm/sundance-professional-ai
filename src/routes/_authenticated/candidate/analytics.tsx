import { createFileRoute } from "@tanstack/react-router";
import { CandidateAnalyticsPage } from "@/components/analytics/Analytics";

const t = "Analytics — Sundance Professionals";
const d = "Track your applications, match scores and career growth.";
export const Route = createFileRoute("/_authenticated/candidate/analytics")({
  head: () => ({ meta: [{ title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <CandidateAnalyticsPage uid={account.userId} />;
}
