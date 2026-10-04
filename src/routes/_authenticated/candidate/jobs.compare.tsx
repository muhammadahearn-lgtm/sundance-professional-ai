import { createFileRoute } from "@tanstack/react-router";
import { CompareJobsPage } from "@/components/candidate-jobs/SavedAndCompare";

export const Route = createFileRoute("/_authenticated/candidate/jobs/compare")({
  head: () => ({ meta: [{ title: "Compare Jobs — Sundance Professionals" }, { name: "description", content: "Compare up to four jobs side by side." }, { property: "og:title", content: "Compare Jobs — Sundance Professionals" }, { property: "og:description", content: "Compare up to four jobs side by side." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <CompareJobsPage account={account} />;
}
