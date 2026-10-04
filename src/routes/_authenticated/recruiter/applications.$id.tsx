import { createFileRoute } from "@tanstack/react-router";
import { CandidateApplicationsPage, CandidateApplicationDetail, RecruiterApplicationsPage, RecruiterApplicationDetail } from "@/components/applications/Applications";

export const Route = createFileRoute("/_authenticated/recruiter/applications/$id")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Review Application — Sundance Professionals" }, { name: "description", content: "Review a candidate application." }, { property: "og:title", content: "Review Application — Sundance Professionals" }, { property: "og:description", content: "Review a candidate application." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  const { id } = Route.useParams(); return <RecruiterApplicationDetail uid={account.userId} id={id} />;
}
