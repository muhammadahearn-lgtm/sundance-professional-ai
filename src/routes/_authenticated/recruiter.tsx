import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { roleGuard } from "@/lib/role-guard";

export const Route = createFileRoute("/_authenticated/recruiter")({
  beforeLoad: roleGuard("recruiter"),
  component: Layout,
});

function Layout() {
  const { account } = Route.useRouteContext();
  return <AppShell account={account} />;
}
