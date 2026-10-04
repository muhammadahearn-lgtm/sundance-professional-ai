import { createFileRoute } from "@tanstack/react-router";
import { CandidateOnboarding } from "@/components/app/Onboarding";

export const Route = createFileRoute("/_authenticated/candidate/onboarding")({
  head: () => ({ meta: [{ title: "Set Up Your Profile — Sundance Professional AI" }, { name: "description", content: "Set Up Your Profile in your Sundance Professional AI account." }, { property: "og:title", content: "Set Up Your Profile — Sundance Professional AI" }, { property: "og:description", content: "Set Up Your Profile in your Sundance Professional AI account." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <CandidateOnboarding account={account} />;
}
