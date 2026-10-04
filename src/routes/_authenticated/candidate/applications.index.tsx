import { createFileRoute } from "@tanstack/react-router";
import { CandidateApplicationsPage, CandidateApplicationDetail, RecruiterApplicationsPage, RecruiterApplicationDetail } from "@/components/applications/Applications";

export const Route = createFileRoute("/_authenticated/candidate/applications/")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Applications — Sundance Professionals" }, { name: "description", content: "Track every application in one place." }, { property: "og:title", content: "Applications — Sundance Professionals" }, { property: "og:description", content: "Track every application in one place." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <CandidateApplicationsPage uid={account.userId} />;
}
