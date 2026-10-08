import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/recruiter/candidates")({
  staticData: { sitemap: false }, component: () => <Outlet /> });
