import { createFileRoute } from "@tanstack/react-router";
import { PlatformAnalyticsPlaceholder } from "@/components/analytics/Analytics";

const t = "Platform Analytics — Sundance Professional AI";
const d = "Marketplace-wide analytics for Sundance administrators.";
export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({ meta: [{ title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }] }),
  component: PlatformAnalyticsPlaceholder,
});
