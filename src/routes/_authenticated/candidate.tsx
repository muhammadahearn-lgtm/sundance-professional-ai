import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { roleGuard } from "@/lib/role-guard";

export const Route = createFileRoute("/_authenticated/candidate")({
  beforeLoad: roleGuard("candidate"),
  component: Layout,
});

function Layout() {
  const { account } = Route.useRouteContext();
  return <AppShell account={account} />;
}
