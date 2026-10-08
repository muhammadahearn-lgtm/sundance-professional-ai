import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/candidate/applications")({
  staticData: { sitemap: false }, component: () => <Outlet /> });
