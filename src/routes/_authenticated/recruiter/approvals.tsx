import { createFileRoute } from "@tanstack/react-router";
import { OfferApprovals } from "@/components/applications/OfferApprovals";

export const Route = createFileRoute("/_authenticated/recruiter/approvals")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Offer Approvals — Sundance Professionals" }, { name: "description", content: "Review and approve offers your teammates want to send before candidates see them." }, { property: "og:title", content: "Offer Approvals — Sundance Professionals" }, { property: "og:description", content: "Review and approve offers your teammates want to send before candidates see them." }] }),
  component: OfferApprovals,
});
