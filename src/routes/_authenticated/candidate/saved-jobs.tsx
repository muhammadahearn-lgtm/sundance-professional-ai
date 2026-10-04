import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/candidate/saved-jobs")({
  beforeLoad: () => { throw redirect({ to: "/candidate/jobs/saved" }); },
});
