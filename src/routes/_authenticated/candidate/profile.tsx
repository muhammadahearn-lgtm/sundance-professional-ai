import { createFileRoute } from "@tanstack/react-router";
import { CandidateProfilePage } from "@/components/profile/CandidateProfilePage";

export const Route = createFileRoute("/_authenticated/candidate/profile")({
  head: () => ({ meta: [{ title: "My Profile — Sundance Professional AI" }, { name: "description", content: "Build your structured talent profile on Sundance Professional AI." }, { property: "og:title", content: "My Profile — Sundance Professional AI" }, { property: "og:description", content: "Build your structured talent profile on Sundance Professional AI." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <CandidateProfilePage account={account} />;
}
