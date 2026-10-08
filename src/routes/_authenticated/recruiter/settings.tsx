import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/components/app/SettingsPage";

export const Route = createFileRoute("/_authenticated/recruiter/settings")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Settings — Sundance Professionals" }, { name: "description", content: "Settings in your Sundance Professionals account." }, { property: "og:title", content: "Settings — Sundance Professionals" }, { property: "og:description", content: "Settings in your Sundance Professionals account." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <SettingsPage account={account} />;
}
