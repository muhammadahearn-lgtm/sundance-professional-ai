import { createFileRoute } from "@tanstack/react-router";
import { MessagesPage } from "@/components/messages/Messages";

const t = "Conversation — Sundance Professional AI";
const d = "A hiring conversation with job and application context.";
export const Route = createFileRoute("/_authenticated/candidate/messages/$conversationId")({
  head: () => ({ meta: [{ title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }] }),
  component: Page,
});
function Page() {
  const { account } = Route.useRouteContext();
  const { conversationId } = Route.useParams();
  return <MessagesPage uid={account.userId} role="candidate" activeId={conversationId} />;
}
