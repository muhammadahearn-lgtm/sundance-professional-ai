import { createFileRoute } from "@tanstack/react-router";
import { PipelinePage } from "@/components/applications/Pipeline";

export const Route = createFileRoute("/_authenticated/recruiter/pipeline/")({
  head: () => ({ meta: [{ title: "Pipeline — Sundance Professional AI" }, { name: "description", content: "Move candidates through your hiring stages." }, { property: "og:title", content: "Pipeline — Sundance Professional AI" }, { property: "og:description", content: "Move candidates through your hiring stages." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <PipelinePage uid={account.userId} />;
}
