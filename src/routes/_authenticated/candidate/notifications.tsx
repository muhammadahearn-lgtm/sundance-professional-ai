import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/candidate/notifications")({
  component: () => <Outlet />,
});
