import { createFileRoute } from "@tanstack/react-router";
import { CandidateProfileView } from "@/components/app/ProfileView";

export const Route = createFileRoute("/_authenticated/candidate/profile")({
  head: () => ({ meta: [{ title: "My Profile — Sundance Professional AI" }, { name: "description", content: "My Profile in your Sundance Professional AI account." }, { property: "og:title", content: "My Profile — Sundance Professional AI" }, { property: "og:description", content: "My Profile in your Sundance Professional AI account." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <CandidateProfileView account={account} />;
}
