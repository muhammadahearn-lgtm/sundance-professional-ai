import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated/candidate/saved-jobs")({
  head: () => ({ meta: [{ title: "Saved Jobs — Sundance Professional AI" }, { name: "description", content: "Saved Jobs in your Sundance Professional AI account." }, { property: "og:title", content: "Saved Jobs — Sundance Professional AI" }, { property: "og:description", content: "Saved Jobs in your Sundance Professional AI account." }] }),
  component: Page,
});

function Page() {
  return <Placeholder title="Saved Jobs" subtitle="Jobs you save will appear here." />;
}
