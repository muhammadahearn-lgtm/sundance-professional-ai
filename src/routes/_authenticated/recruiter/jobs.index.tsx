import { createFileRoute } from "@tanstack/react-router";
import { JobsDashboard } from "@/components/jobs/JobsDashboard";

export const Route = createFileRoute("/_authenticated/recruiter/jobs/")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Jobs — Sundance Professionals" }, { name: "description", content: "Create, publish and manage your open roles." }, { property: "og:title", content: "Jobs — Sundance Professionals" }, { property: "og:description", content: "Create, publish and manage your open roles." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <JobsDashboard account={account} />;
}
