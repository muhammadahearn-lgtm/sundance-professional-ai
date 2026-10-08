import { createFileRoute } from "@tanstack/react-router";
import { RecruiterProfilePage } from "@/components/recruiter/RecruiterProfilePage";

export const Route = createFileRoute("/_authenticated/recruiter/profile")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Recruiter Profile — Sundance Professionals" }, { name: "description", content: "Manage your recruiter identity, specialization and hiring focus." }, { property: "og:title", content: "Recruiter Profile — Sundance Professionals" }, { property: "og:description", content: "Manage your recruiter identity, specialization and hiring focus." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <RecruiterProfilePage account={account} />;
}
