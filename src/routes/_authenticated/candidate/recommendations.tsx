import { createFileRoute } from "@tanstack/react-router";
import { CandidateRecommendationsPage } from "@/components/recommend/Recommend";

const t = "Recommendations — Sundance Professional AI";
const d = "Personalized, ranked job, skill, technology, certification and career recommendations.";
export const Route = createFileRoute("/_authenticated/candidate/recommendations")({
  head: () => ({ meta: [{ title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }] }),
  component: Page,
});
function Page() {
  const { account } = Route.useRouteContext();
  return <CandidateRecommendationsPage uid={account.userId} />;
}
