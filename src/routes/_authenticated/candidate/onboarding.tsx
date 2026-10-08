import { createFileRoute } from "@tanstack/react-router";
import { CandidateOnboarding } from "@/components/app/Onboarding";

export const Route = createFileRoute("/_authenticated/candidate/onboarding")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Set Up Your Profile — Sundance Professionals" }, { name: "description", content: "Set Up Your Profile in your Sundance Professionals account." }, { property: "og:title", content: "Set Up Your Profile — Sundance Professionals" }, { property: "og:description", content: "Set Up Your Profile in your Sundance Professionals account." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <CandidateOnboarding account={account} />;
}
