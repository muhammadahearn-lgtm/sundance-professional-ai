import { createFileRoute } from "@tanstack/react-router";
import { JobDetail } from "@/components/jobs/JobDetail";

export const Route = createFileRoute("/_authenticated/recruiter/jobs/$id/")({
  head: () => ({ meta: [{ title: "Job Manage this job, its status and requirements.etails — Sundance Professionals" }, { name: "description", content: "Manage this job, its status and requirements." }, { property: "og:title", content: "Job Manage this job, its status and requirements.etails — Sundance Professionals" }, { property: "og:description", content: "Manage this job, its status and requirements." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  const { id } = Route.useParams();
  return <JobDetail account={account} id={id} />;
}
