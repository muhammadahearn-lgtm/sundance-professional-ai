import { createFileRoute } from "@tanstack/react-router";
import { RecruiterDashboard } from "@/components/app/RecruiterDashboard";

export const Route = createFileRoute("/_authenticated/recruiter/dashboard")({
  head: () => ({ meta: [{ title: "Recruiter Dashboard — Sundance Professionals" }, { name: "description", content: "Recruiter Dashboard in your Sundance Professionals account." }, { property: "og:title", content: "Recruiter Dashboard — Sundance Professionals" }, { property: "og:description", content: "Recruiter Dashboard in your Sundance Professionals account." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <RecruiterDashboard account={account} />;
}
