import { createFileRoute } from "@tanstack/react-router";
import { RecruiterProfileView } from "@/components/app/ProfileView";

export const Route = createFileRoute("/_authenticated/recruiter/profile")({
  head: () => ({ meta: [{ title: "My Profile — Sundance Professional AI" }, { name: "description", content: "My Profile in your Sundance Professional AI account." }, { property: "og:title", content: "My Profile — Sundance Professional AI" }, { property: "og:description", content: "My Profile in your Sundance Professional AI account." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <RecruiterProfileView account={account} />;
}
