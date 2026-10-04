import { createFileRoute } from "@tanstack/react-router";
import { CareerPage } from "@/components/career/Career";

export const Route = createFileRoute("/_authenticated/candidate/career")({
  head: () => ({ meta: [{ title: "Career Intelligence — Sundance Professional AI" }, { name: "description", content: "See your career readiness, skill gaps, salary range and growth roadmap." }, { property: "og:title", content: "Career Intelligence — Sundance Professional AI" }, { property: "og:description", content: "See your career readiness, skill gaps, salary range and growth roadmap." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  return <CareerPage uid={account.userId} />;
}
