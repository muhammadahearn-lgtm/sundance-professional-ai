import { createFileRoute } from "@tanstack/react-router";
import { CandidateDashboard } from "@/components/app/CandidateDashboard";

export const Route = createFileRoute("/_authenticated/candidate/dashboard")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Candidate Dashboard — Sundance Professionals" }, { name: "description", content: "Candidate Dashboard in your Sundance Professionals account." }, { property: "og:title", content: "Candidate Dashboard — Sundance Professionals" }, { property: "og:description", content: "Candidate Dashboard in your Sundance Professionals account." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <CandidateDashboard account={account} />;
}
