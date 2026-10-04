import { createFileRoute } from "@tanstack/react-router";
import { CandidateDashboard } from "@/components/app/CandidateDashboard";

export const Route = createFileRoute("/_authenticated/candidate/dashboard")({
  head: () => ({ meta: [{ title: "Candidate Dashboard — Sundance Professional AI" }, { name: "description", content: "Candidate Dashboard in your Sundance Professional AI account." }, { property: "og:title", content: "Candidate Dashboard — Sundance Professional AI" }, { property: "og:description", content: "Candidate Dashboard in your Sundance Professional AI account." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <CandidateDashboard account={account} />;
}
