import { createFileRoute } from "@tanstack/react-router";
import { NotificationCenter } from "@/components/notifications/Notifications";

const t = "Notifications — Sundance Professionals";
const d = "Recruiter notifications: applications, messages, matches and more.";
export const Route = createFileRoute("/_authenticated/recruiter/notifications/")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <NotificationCenter uid={account.userId} role="recruiter" />;
}
