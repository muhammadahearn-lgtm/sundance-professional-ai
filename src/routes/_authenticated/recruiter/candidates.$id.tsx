import { createFileRoute } from "@tanstack/react-router";
import { RecruiterCandidatePage } from "@/components/talent/Talent";

export const Route = createFileRoute("/_authenticated/recruiter/candidates/$id")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Candidate Profile — Sundance Professionals" }, { name: "description", content: "Review a candidate profile." }, { property: "og:title", content: "Candidate Profile — Sundance Professionals" }, { property: "og:description", content: "Review a candidate profile." }] }),
  validateSearch: (s: Record<string, unknown>): { job?: string } => (typeof s["job"] === "string" && s["job"] ? { job: s["job"] } : {}),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  const { id } = Route.useParams();
  const { job } = Route.useSearch();
  return <RecruiterCandidatePage uid={account.userId} id={id} jobId={job} />;
}
