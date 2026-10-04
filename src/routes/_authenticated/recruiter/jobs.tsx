import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated/recruiter/jobs")({
  head: () => ({ meta: [{ title: "Jobs — Sundance Professional AI" }, { name: "description", content: "Jobs in your Sundance Professional AI account." }, { property: "og:title", content: "Jobs — Sundance Professional AI" }, { property: "og:description", content: "Jobs in your Sundance Professional AI account." }] }),
  component: Page,
});

function Page() {
  return <Placeholder title="Jobs" subtitle="Create and manage your open roles." />;
}
