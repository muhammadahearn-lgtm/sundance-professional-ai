import { createFileRoute } from "@tanstack/react-router";
import { CandidateApplicationsPage, CandidateApplicationDetail, RecruiterApplicationsPage, RecruiterApplicationDetail } from "@/components/applications/Applications";

export const Route = createFileRoute("/_authenticated/candidate/applications/$id")({
  head: () => ({ meta: [{ title: "Application Your application status timeline.etails — Sundance Professional AI" }, { name: "description", content: "Your application status timeline." }, { property: "og:title", content: "Application Your application status timeline.etails — Sundance Professional AI" }, { property: "og:description", content: "Your application status timeline." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  const { id } = Route.useParams(); return <CandidateApplicationDetail id={id} />;
}
