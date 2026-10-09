import { createFileRoute } from "@tanstack/react-router";
import { InterviewsHub } from "@/components/applications/InterviewsHub";

export const Route = createFileRoute("/_authenticated/recruiter/interviews")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Interview Schedule — Sundance Professionals" }, { name: "description", content: "Your interview schedule across every job and candidate, with calendar options." }, { property: "og:title", content: "Interview Schedule — Sundance Professionals" }, { property: "og:description", content: "Your interview schedule across every job and candidate, with calendar options." }] }),
  validateSearch: (s: Record<string, unknown>): { score?: string } => (typeof s["score"] === "string" ? { score: s["score"] } : {}),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  const { score } = Route.useSearch();
  return <InterviewsHub uid={account.userId} role="recruiter" scoreId={score} />;
}
