import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/components/app/SettingsPage";

export const Route = createFileRoute("/_authenticated/recruiter/settings")({
  head: () => ({ meta: [{ title: "Settings — Sundance Professionals" }, { name: "description", content: "Settings in your Sundance Professionals account." }, { property: "og:title", content: "Settings — Sundance Professionals" }, { property: "og:description", content: "Settings in your Sundance Professionals account." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <SettingsPage account={account} />;
}
