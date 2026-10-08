import { createFileRoute } from "@tanstack/react-router";
import { CompareCandidatesPage } from "@/components/talent/Talent";

export const Route = createFileRoute("/_authenticated/recruiter/candidates/compare")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Compare Candidates — Sundance Professionals" }, { name: "description", content: "Compare candidates side by side." }, { property: "og:title", content: "Compare Candidates — Sundance Professionals" }, { property: "og:description", content: "Compare candidates side by side." }] }),
  validateSearch: (s: Record<string, unknown>): { job?: string } => (typeof s["job"] === "string" && s["job"] ? { job: s["job"] } : {}),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  const { job } = Route.useSearch();
  return <CompareCandidatesPage key={job ?? ""} uid={account.userId} initialJob={job ?? ""} />;
}
