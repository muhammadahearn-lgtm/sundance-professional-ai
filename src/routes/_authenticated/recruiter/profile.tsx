import { createFileRoute } from "@tanstack/react-router";
import { RecruiterProfilePage } from "@/components/recruiter/RecruiterProfilePage";

export const Route = createFileRoute("/_authenticated/recruiter/profile")({
  head: () => ({ meta: [{ title: "Recruiter Profile — Sundance Professional AI" }, { name: "description", content: "Manage your recruiter identity, specialization and hiring focus." }, { property: "og:title", content: "Recruiter Profile — Sundance Professional AI" }, { property: "og:description", content: "Manage your recruiter identity, specialization and hiring focus." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <RecruiterProfilePage account={account} />;
}
