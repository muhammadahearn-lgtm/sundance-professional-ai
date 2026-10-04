import { createFileRoute } from "@tanstack/react-router";
import { CandidateApplicationsPage, CandidateApplicationDetail, RecruiterApplicationsPage, RecruiterApplicationDetail } from "@/components/applications/Applications";

export const Route = createFileRoute("/_authenticated/recruiter/applications/$id")({
  head: () => ({ meta: [{ title: "Review Application — Sundance Professional AI" }, { name: "description", content: "Review a candidate application." }, { property: "og:title", content: "Review Application — Sundance Professional AI" }, { property: "og:description", content: "Review a candidate application." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  const { id } = Route.useParams(); return <RecruiterApplicationDetail uid={account.userId} id={id} />;
}
