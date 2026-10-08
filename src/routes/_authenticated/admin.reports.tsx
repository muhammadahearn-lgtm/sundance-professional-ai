import { createFileRoute } from "@tanstack/react-router";
import { ReportsReview } from "@/components/moderation/ReportsReview";

const t = "Report Review — Sundance Professionals";
const d = "Review and resolve user reports on Sundance Professionals.";
export const Route = createFileRoute("/_authenticated/admin/reports")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }] }),
  component: ReportsReview,
});
