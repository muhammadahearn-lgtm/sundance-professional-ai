import { createFileRoute } from "@tanstack/react-router";
import { MessagesPage } from "@/components/messages/Messages";

const t = "Messages — Sundance Professionals";
const d = "Hiring conversations with full job and application context.";
export const Route = createFileRoute("/_authenticated/candidate/messages/")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }] }),
  component: Page,
});
function Page() {
  const { account } = Route.useRouteContext();
  return <MessagesPage uid={account.userId} role="candidate" />;
}
