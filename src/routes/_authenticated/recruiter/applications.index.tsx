import { createFileRoute } from "@tanstack/react-router";
import { CandidateApplicationsPage, CandidateApplicationDetail, RecruiterApplicationsPage, RecruiterApplicationDetail } from "@/components/applications/Applications";

export const Route = createFileRoute("/_authenticated/recruiter/applications/")({
  head: () => ({ meta: [{ title: "Applications — Sundance Professionals" }, { name: "description", content: "Review applications to your jobs." }, { property: "og:title", content: "Applications — Sundance Professionals" }, { property: "og:description", content: "Review applications to your jobs." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <RecruiterApplicationsPage uid={account.userId} />;
}
