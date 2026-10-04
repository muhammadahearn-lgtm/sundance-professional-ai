import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated/recruiter/pipeline")({
  head: () => ({ meta: [{ title: "Pipeline — Sundance Professional AI" }, { name: "description", content: "Pipeline in your Sundance Professional AI account." }, { property: "og:title", content: "Pipeline — Sundance Professional AI" }, { property: "og:description", content: "Pipeline in your Sundance Professional AI account." }] }),
  component: Page,
});

function Page() {
  return <Placeholder title="Pipeline" subtitle="Move candidates through your hiring stages." />;
}
