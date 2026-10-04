import { createFileRoute } from "@tanstack/react-router";
import { PlatformAnalyticsPlaceholder } from "@/components/analytics/Analytics";

const t = "Platform Analytics — Sundance Professionals";
const d = "Marketplace-wide analytics for Sundance Professionals administrators.";
export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }] }),
  component: PlatformAnalyticsPlaceholder,
});
