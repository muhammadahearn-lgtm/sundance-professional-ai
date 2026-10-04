import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/components/app/SettingsPage";

export const Route = createFileRoute("/_authenticated/candidate/settings")({
  head: () => ({ meta: [{ title: "Settings — Sundance Professional AI" }, { name: "description", content: "Settings in your Sundance Professional AI account." }, { property: "og:title", content: "Settings — Sundance Professional AI" }, { property: "og:description", content: "Settings in your Sundance Professional AI account." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <SettingsPage account={account} />;
}
