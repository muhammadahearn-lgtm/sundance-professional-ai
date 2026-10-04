import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/recruiter/")({
  beforeLoad: () => { throw redirect({ to: "/recruiter/dashboard" }); },
});
