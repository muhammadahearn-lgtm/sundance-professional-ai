import { createFileRoute } from "@tanstack/react-router";
import { NotificationCenter } from "@/components/notifications/Notifications";

const t = "Notifications — Sundance Professional AI";
const d = "Candidate notifications: applications, messages, matches and more.";
export const Route = createFileRoute("/_authenticated/candidate/notifications/")({
  head: () => ({ meta: [{ title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <NotificationCenter uid={account.userId} role="candidate" />;
}
