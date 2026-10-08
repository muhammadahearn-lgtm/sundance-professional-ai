import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/candidate/saved-jobs")({
  staticData: { sitemap: false },
  beforeLoad: () => { throw redirect({ to: "/candidate/jobs/saved" }); },
});
