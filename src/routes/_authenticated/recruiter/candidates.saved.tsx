import { createFileRoute } from "@tanstack/react-router";
import { RecruiterCandidatePage, SavedCandidatesPage, CompareCandidatesPage } from "@/components/talent/Talent";

export const Route = createFileRoute("/_authenticated/recruiter/candidates/saved")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Saved Candidates — Sundance Professionals" }, { name: "description", content: "Candidates you saved for later." }, { property: "og:title", content: "Saved Candidates — Sundance Professionals" }, { property: "og:description", content: "Candidates you saved for later." }] }),
  validateSearch: (s: Record<string, unknown>): { job?: string } => (typeof s["job"] === "string" && s["job"] ? { job: s["job"] } : {}),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  const { job } = Route.useSearch();
  return <SavedCandidatesPage key={job ?? ""} uid={account.userId} initialJob={job ?? ""} />;
}
