import { createFileRoute } from "@tanstack/react-router";
import { PipelinePage } from "@/components/applications/Pipeline";

export const Route = createFileRoute("/_authenticated/recruiter/pipeline/$jobId")({
  staticData: { sitemap: false },
  validateSearch: (s: Record<string, unknown>): { candidate?: string } =>
    typeof s.candidate === "string" && /^[0-9a-f-]{36}$/i.test(s.candidate) ? { candidate: s.candidate } : {},
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Job Pipeline — Sundance Professionals" }, { name: "description", content: "Hiring pipeline for one job." }, { property: "og:title", content: "Job Pipeline — Sundance Professionals" }, { property: "og:description", content: "Hiring pipeline for one job." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  const { jobId } = Route.useParams();
  const { candidate } = Route.useSearch();
  return <PipelinePage uid={account.userId} jobId={jobId} focus={candidate} />;
}
