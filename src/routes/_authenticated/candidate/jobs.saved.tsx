import { createFileRoute } from "@tanstack/react-router";
import { SavedJobsPage } from "@/components/candidate-jobs/SavedAndCompare";

export const Route = createFileRoute("/_authenticated/candidate/jobs/saved")({
  head: () => ({ meta: [{ title: "Saved Jobs — Sundance Professional AI" }, { name: "description", content: "Opportunities you've saved for later." }, { property: "og:title", content: "Saved Jobs — Sundance Professional AI" }, { property: "og:description", content: "Opportunities you've saved for later." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <SavedJobsPage account={account} />;
}
