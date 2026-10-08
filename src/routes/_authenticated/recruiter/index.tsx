import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/recruiter/")({
  staticData: { sitemap: false },
  beforeLoad: () => { throw redirect({ to: "/recruiter/dashboard" }); },
});
