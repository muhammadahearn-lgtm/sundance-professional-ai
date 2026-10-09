import { createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { RecruiterApplicationsPage } from "@/components/applications/Applications";
import { ApplicationRequisitionHub } from "@/components/applications/ApplicationRequisitionHub";

const schema = z.object({
  job: fallback(z.string(), "").optional(),
  view: fallback(z.string(), "").optional(),
  q: fallback(z.string(), "").optional(),
  co: fallback(z.string(), "").optional(),
  status: fallback(z.string(), "").optional(),
});

export const Route = createFileRoute("/_authenticated/recruiter/applications/")({
  staticData: { sitemap: false },
  validateSearch: zodValidator(schema),
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Applications — Sundance Professionals" }, { name: "description", content: "Review applications to your jobs." }, { property: "og:title", content: "Applications — Sundance Professionals" }, { property: "og:description", content: "Review applications to your jobs." }] }),
  component: Page,
});

function Page() {
  const { account } = Route.useRouteContext();
  const s = Route.useSearch();
  if (!s.job && s.view !== "stream") return <ApplicationRequisitionHub uid={account.userId} q={s.q ?? ""} co={s.co ?? ""} status={s.status ?? "active"} />;
  return <RecruiterApplicationsPage key={s.job ?? "stream"} uid={account.userId} job={s.job ?? ""} />;
}
