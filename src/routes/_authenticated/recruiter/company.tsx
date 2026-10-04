import { createFileRoute } from "@tanstack/react-router";
import { RecruiterProfileView } from "@/components/app/ProfileView";

export const Route = createFileRoute("/_authenticated/recruiter/company")({
  head: () => ({ meta: [{ title: "Company — Sundance Professional AI" }, { name: "description", content: "Company in your Sundance Professional AI account." }, { property: "og:title", content: "Company — Sundance Professional AI" }, { property: "og:description", content: "Company in your Sundance Professional AI account." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <RecruiterProfileView account={account} company />;
}
