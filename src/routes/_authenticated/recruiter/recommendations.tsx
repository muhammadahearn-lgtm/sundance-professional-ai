import { createFileRoute } from "@tanstack/react-router";
import { RecruiterRecommendationsPage } from "@/components/recommend/Recommend";

const t = "Recommendations — Sundance Professional AI";
const d = "Ranked candidate, pipeline and hiring recommendations for your open roles.";
export const Route = createFileRoute("/_authenticated/recruiter/recommendations")({
  head: () => ({ meta: [{ title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }] }),
  component: Page,
});
function Page() {
  const { account } = Route.useRouteContext();
  return <RecruiterRecommendationsPage uid={account.userId} />;
}
