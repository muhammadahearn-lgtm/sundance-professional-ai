import { createFileRoute } from "@tanstack/react-router";
import { RecruiterCandidatePage, SavedCandidatesPage, CompareCandidatesPage } from "@/components/talent/Talent";

export const Route = createFileRoute("/_authenticated/recruiter/candidates/saved")({
  head: () => ({ meta: [{ title: "Saved Candidates — Sundance Professional AI" }, { name: "description", content: "Candidates you saved for later." }, { property: "og:title", content: "Saved Candidates — Sundance Professional AI" }, { property: "og:description", content: "Candidates you saved for later." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <SavedCandidatesPage uid={account.userId} />;
}
