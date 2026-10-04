import { redirect } from "@tanstack/react-router";
import { fetchAccount } from "./account";
import { dashboardPath, onboardingPath, type Role } from "./auth-rules";

/** beforeLoad for a role area: blocks other roles and enforces onboarding. */
export function roleGuard(role: Role) {
  return async ({ location }: { location: { pathname: string } }) => {
    const account = await fetchAccount();
    if (!account) throw redirect({ to: "/login", search: { reason: "expired" } });
    if (account.role !== role) throw redirect({ to: "/unauthorized" });
    if (account.status === "suspended") throw redirect({ to: "/unauthorized" });
    const onOnboarding = location.pathname === onboardingPath(role);
    if (!account.onboardingCompleted && !onOnboarding) throw redirect({ to: onboardingPath(role) });
    if (account.onboardingCompleted && (onOnboarding || location.pathname === `/${role}` || location.pathname === `/${role}/`)) {
      throw redirect({ to: dashboardPath(role) });
    }
    return { account };
  };
}
