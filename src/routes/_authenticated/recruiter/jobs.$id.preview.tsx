import { createFileRoute } from "@tanstack/react-router";
import { JobPreview } from "@/components/jobs/JobPreview";

export const Route = createFileRoute("/_authenticated/recruiter/jobs/$id/preview")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Job Preview — Sundance Professionals" }, { name: "description", content: "See this job exactly as candidates will." }, { property: "og:title", content: "Job Preview — Sundance Professionals" }, { property: "og:description", content: "See this job exactly as candidates will." }] }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  return <JobPreview id={id} />;
}
