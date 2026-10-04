import { createFileRoute } from "@tanstack/react-router";
import { CandidateApplicationsPage, CandidateApplicationDetail, RecruiterApplicationsPage, RecruiterApplicationDetail } from "@/components/applications/Applications";

export const Route = createFileRoute("/_authenticated/candidate/applications/$id")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Application Your application status timeline.etails — Sundance Professionals" }, { name: "description", content: "Your application status timeline." }, { property: "og:title", content: "Application Your application status timeline.etails — Sundance Professionals" }, { property: "og:description", content: "Your application status timeline." }] }),
  component: Page,
});

function Page() {

  const { id } = Route.useParams(); const { account } = Route.useRouteContext(); return <CandidateApplicationDetail id={id} uid={account.userId} />;
}
