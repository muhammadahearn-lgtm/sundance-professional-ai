import { createFileRoute } from "@tanstack/react-router";
import { RecruiterCandidatePage, SavedCandidatesPage, CompareCandidatesPage } from "@/components/talent/Talent";

export const Route = createFileRoute("/_authenticated/recruiter/candidates/compare")({
  head: () => ({ meta: [{ title: "Compare Candidates — Sundance Professional AI" }, { name: "description", content: "Compare candidates side by side." }, { property: "og:title", content: "Compare Candidates — Sundance Professional AI" }, { property: "og:description", content: "Compare candidates side by side." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <CompareCandidatesPage uid={account.userId} />;
}
