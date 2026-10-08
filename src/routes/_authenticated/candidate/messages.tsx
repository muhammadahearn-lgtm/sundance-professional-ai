import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/candidate/messages")({
  staticData: { sitemap: false },
  component: () => <Outlet />,
});
