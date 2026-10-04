import { createFileRoute } from "@tanstack/react-router";
import { RecruiterCandidatePage, SavedCandidatesPage, CompareCandidatesPage } from "@/components/talent/Talent";

export const Route = createFileRoute("/_authenticated/recruiter/candidates/$id")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Candidate Profile — Sundance Professionals" }, { name: "description", content: "Review a candidate profile." }, { property: "og:title", content: "Candidate Profile — Sundance Professionals" }, { property: "og:description", content: "Review a candidate profile." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  const { id } = Route.useParams(); return <RecruiterCandidatePage uid={account.userId} id={id} />;
}
