import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/candidate/")({
  staticData: { sitemap: false },
  beforeLoad: () => { throw redirect({ to: "/candidate/dashboard" }); },
});
