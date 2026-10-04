import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/recruiter/applications")({ component: () => <Outlet /> });
