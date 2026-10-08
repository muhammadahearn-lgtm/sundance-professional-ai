import { createFileRoute } from "@tanstack/react-router";
import { SavedJobsPage } from "@/components/candidate-jobs/SavedAndCompare";

export const Route = createFileRoute("/_authenticated/candidate/jobs/saved")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Saved Jobs — Sundance Professionals" }, { name: "description", content: "Opportunities you've saved for later." }, { property: "og:title", content: "Saved Jobs — Sundance Professionals" }, { property: "og:description", content: "Opportunities you've saved for later." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <SavedJobsPage account={account} />;
}
