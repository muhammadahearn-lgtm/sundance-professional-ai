import { createFileRoute } from "@tanstack/react-router";
import { NotificationDetail } from "@/components/notifications/Notifications";

const t = "Notification — Sundance Professional AI";
const d = "Notification details and related actions.";
export const Route = createFileRoute("/_authenticated/candidate/notifications/$id")({
  head: () => ({ meta: [{ title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  const { id } = Route.useParams();
  return <NotificationDetail uid={account.userId} role="candidate" id={id} />;
}
