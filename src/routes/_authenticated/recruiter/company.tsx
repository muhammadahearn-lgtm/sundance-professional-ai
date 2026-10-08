import { createFileRoute } from "@tanstack/react-router";
import { CompanyProfilePage } from "@/components/recruiter/CompanyProfilePage";

export const Route = createFileRoute("/_authenticated/recruiter/company")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Company Profile — Sundance Professionals" }, { name: "description", content: "Build your employer profile, branding and hiring information." }, { property: "og:title", content: "Company Profile — Sundance Professionals" }, { property: "og:description", content: "Build your employer profile, branding and hiring information." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <CompanyProfilePage account={account} />;
}
