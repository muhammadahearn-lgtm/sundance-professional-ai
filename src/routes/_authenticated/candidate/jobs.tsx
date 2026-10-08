import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/candidate/jobs")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Jobs — Sundance Professionals" }, { name: "description", content: "Search and compare roles matched to your skills." }, { property: "og:title", content: "Jobs — Sundance Professionals" }, { property: "og:description", content: "Search and compare roles matched to your skills." }] }),
  component: () => <Outlet />,
});
