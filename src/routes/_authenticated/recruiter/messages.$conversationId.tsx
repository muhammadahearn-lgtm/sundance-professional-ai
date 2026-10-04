import { createFileRoute } from "@tanstack/react-router";
import { MessagesPage } from "@/components/messages/Messages";

const t = "Conversation — Sundance Professionals";
const d = "A hiring conversation with job and application context.";
export const Route = createFileRoute("/_authenticated/recruiter/messages/$conversationId")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }] }),
  component: Page,
});
function Page() {
  const { account } = Route.useRouteContext();
  const { conversationId } = Route.useParams();
  return <MessagesPage uid={account.userId} role="recruiter" activeId={conversationId} />;
}
