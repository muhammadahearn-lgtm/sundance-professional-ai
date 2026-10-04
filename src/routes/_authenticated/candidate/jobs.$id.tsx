import { createFileRoute } from "@tanstack/react-router";
import { CandidateJobDetail } from "@/components/candidate-jobs/CandidateJobDetail";

export const Route = createFileRoute("/_authenticated/candidate/jobs/$id")({
  head: () => ({ meta: [{ title: "Job Details — Sundance Professional AI" }, { name: "description", content: "Role details, requirements and company information." }, { property: "og:title", content: "Job Details — Sundance Professional AI" }, { property: "og:description", content: "Role details, requirements and company information." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  const { id } = Route.useParams();
  return <CandidateJobDetail account={account} id={id} />;
}
