import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/candidate/jobs")({
  head: () => ({ meta: [{ title: "Jobs — Sundance Professionals" }, { name: "description", content: "Search and compare roles matched to your skills." }, { property: "og:title", content: "Jobs — Sundance Professionals" }, { property: "og:description", content: "Search and compare roles matched to your skills." }] }),
  component: () => <Outlet />,
});
