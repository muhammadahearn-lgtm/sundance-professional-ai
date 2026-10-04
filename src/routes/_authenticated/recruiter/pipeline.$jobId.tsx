import { createFileRoute } from "@tanstack/react-router";
import { PipelinePage } from "@/components/applications/Pipeline";

export const Route = createFileRoute("/_authenticated/recruiter/pipeline/$jobId")({
  head: () => ({ meta: [{ title: "Job Pipeline — Sundance Professionals" }, { name: "description", content: "Hiring pipeline for one job." }, { property: "og:title", content: "Job Pipeline — Sundance Professionals" }, { property: "og:description", content: "Hiring pipeline for one job." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  const { jobId } = Route.useParams(); return <PipelinePage uid={account.userId} jobId={jobId} />;
}
