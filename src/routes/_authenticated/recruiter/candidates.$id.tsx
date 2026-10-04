import { createFileRoute } from "@tanstack/react-router";
import { RecruiterCandidatePage, SavedCandidatesPage, CompareCandidatesPage } from "@/components/talent/Talent";

export const Route = createFileRoute("/_authenticated/recruiter/candidates/$id")({
  head: () => ({ meta: [{ title: "Candidate Profile — Sundance Professional AI" }, { name: "description", content: "Review a candidate profile." }, { property: "og:title", content: "Candidate Profile — Sundance Professional AI" }, { property: "og:description", content: "Review a candidate profile." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  const { id } = Route.useParams(); return <RecruiterCandidatePage uid={account.userId} id={id} />;
}
