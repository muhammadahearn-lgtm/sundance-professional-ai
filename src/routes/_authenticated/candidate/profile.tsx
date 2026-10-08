import { createFileRoute } from "@tanstack/react-router";
import { CandidateProfilePage } from "@/components/profile/CandidateProfilePage";

export const Route = createFileRoute("/_authenticated/candidate/profile")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "My Profile — Sundance Professionals" }, { name: "description", content: "Build your structured talent profile on Sundance Professionals." }, { property: "og:title", content: "My Profile — Sundance Professionals" }, { property: "og:description", content: "Build your structured talent profile on Sundance Professionals." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <CandidateProfilePage account={account} />;
}
