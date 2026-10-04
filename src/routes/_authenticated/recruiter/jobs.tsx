import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/recruiter/jobs")({
  head: () => ({ meta: [{ title: "Jobs — Sundance Professionals" }, { name: "description", content: "Create and manage your open roles." }, { property: "og:title", content: "Jobs — Sundance Professionals" }, { property: "og:description", content: "Create and manage your open roles." }] }),
  component: Page,
});

function Page() {
  return <Outlet />;
}
