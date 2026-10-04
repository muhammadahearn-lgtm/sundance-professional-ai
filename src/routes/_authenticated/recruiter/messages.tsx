import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated/recruiter/messages")({
  head: () => ({ meta: [{ title: "Messages — Sundance Professional AI" }, { name: "description", content: "Messages in your Sundance Professional AI account." }, { property: "og:title", content: "Messages — Sundance Professional AI" }, { property: "og:description", content: "Messages in your Sundance Professional AI account." }] }),
  component: Page,
});

function Page() {
  return <Placeholder title="Messages" subtitle="Conversations with candidates will appear here." />;
}
