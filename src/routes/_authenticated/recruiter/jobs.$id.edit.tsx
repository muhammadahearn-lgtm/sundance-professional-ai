import { createFileRoute } from "@tanstack/react-router";
import { JobWizard } from "@/components/jobs/JobWizard";

export const Route = createFileRoute("/_authenticated/recruiter/jobs/$id/edit")({
  head: () => ({ meta: [{ title: "Edit Job — Sundance Professionals" }, { name: "description", content: "Update this job and its structured requirements." }, { property: "og:title", content: "Edit Job — Sundance Professionals" }, { property: "og:description", content: "Update this job and its structured requirements." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  const { id } = Route.useParams();
  return <JobWizard account={account} jobId={id} />;
}
