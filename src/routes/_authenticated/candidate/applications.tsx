import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated/candidate/applications")({
  head: () => ({ meta: [{ title: "Applications — Sundance Professional AI" }, { name: "description", content: "Applications in your Sundance Professional AI account." }, { property: "og:title", content: "Applications — Sundance Professional AI" }, { property: "og:description", content: "Applications in your Sundance Professional AI account." }] }),
  component: Page,
});

function Page() {
  return <Placeholder title="Applications" subtitle="Track every application in one place." />;
}
