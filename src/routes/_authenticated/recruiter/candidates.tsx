import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated/recruiter/candidates")({
  head: () => ({ meta: [{ title: "Search Talent — Sundance Professional AI" }, { name: "description", content: "Search Talent in your Sundance Professional AI account." }, { property: "og:title", content: "Search Talent — Sundance Professional AI" }, { property: "og:description", content: "Search Talent in your Sundance Professional AI account." }] }),
  component: Page,
});

function Page() {
  return <Placeholder title="Search Talent" subtitle="Find and compare qualified candidates." />;
}
