import { createFileRoute } from "@tanstack/react-router";
import { RecruiterCandidatePage, SavedCandidatesPage, CompareCandidatesPage } from "@/components/talent/Talent";

export const Route = createFileRoute("/_authenticated/recruiter/candidates/compare")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Compare Candidates — Sundance Professionals" }, { name: "description", content: "Compare candidates side by side." }, { property: "og:title", content: "Compare Candidates — Sundance Professionals" }, { property: "og:description", content: "Compare candidates side by side." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <CompareCandidatesPage uid={account.userId} />;
}
