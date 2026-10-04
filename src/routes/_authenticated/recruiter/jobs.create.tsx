import { createFileRoute } from "@tanstack/react-router";
import { JobWizard } from "@/components/jobs/JobWizard";

export const Route = createFileRoute("/_authenticated/recruiter/jobs/create")({
  head: () => ({ meta: [{ title: "Create Job — Sundance Professional AI" }, { name: "description", content: "Post a new structured job in five steps." }, { property: "og:title", content: "Create Job — Sundance Professional AI" }, { property: "og:description", content: "Post a new structured job in five steps." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <JobWizard account={account} />;
}
