import { createFileRoute } from "@tanstack/react-router";
import { InterviewsHub } from "@/components/applications/InterviewsHub";

export const Route = createFileRoute("/_authenticated/candidate/interviews")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "My Interviews — Sundance Professionals" }, { name: "description", content: "See your upcoming interviews, join links and add them to your calendar." }, { property: "og:title", content: "My Interviews — Sundance Professionals" }, { property: "og:description", content: "See your upcoming interviews, join links and add them to your calendar." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <InterviewsHub uid={account.userId} role="candidate" />;
}
