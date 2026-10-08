import { createFileRoute, redirect } from "@tanstack/react-router";
import { fetchAccount } from "@/lib/account";

export const Route = createFileRoute("/_authenticated/notifications/")({
  staticData: { sitemap: false },
  beforeLoad: async () => {
    const a = await fetchAccount();
    if (!a) throw redirect({ to: "/login", search: { reason: "expired" } });
    throw redirect({ to: a.role === "candidate" ? "/candidate/notifications" : "/recruiter/notifications" });
  },
});
