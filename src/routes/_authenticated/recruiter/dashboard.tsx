import { createFileRoute } from "@tanstack/react-router";
import { RecruiterDashboard } from "@/components/app/Dashboards";

export const Route = createFileRoute("/_authenticated/recruiter/dashboard")({
  head: () => ({ meta: [{ title: "Recruiter Dashboard — Sundance Professional AI" }, { name: "description", content: "Recruiter Dashboard in your Sundance Professional AI account." }, { property: "og:title", content: "Recruiter Dashboard — Sundance Professional AI" }, { property: "og:description", content: "Recruiter Dashboard in your Sundance Professional AI account." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <RecruiterDashboard account={account} />;
}
