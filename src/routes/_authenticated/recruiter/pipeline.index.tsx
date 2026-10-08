import { createFileRoute } from "@tanstack/react-router";
import { PipelinePage } from "@/components/applications/Pipeline";

export const Route = createFileRoute("/_authenticated/recruiter/pipeline/")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Pipeline — Sundance Professionals" }, { name: "description", content: "Move candidates through your hiring stages." }, { property: "og:title", content: "Pipeline — Sundance Professionals" }, { property: "og:description", content: "Move candidates through your hiring stages." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <PipelinePage uid={account.userId} />;
}
