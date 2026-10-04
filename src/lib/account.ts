import { supabase } from "@/integrations/supabase/client";
import { isRole, type Role } from "./auth-rules";
import { flushPendingAvatar } from "./avatar";

export type Account = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: string;
  onboardingCompleted: boolean;
  avatarPath: string | null;
};

/** Load the signed-in user's account + role (browser, RLS-scoped). */
export async function fetchAccount(): Promise<Account | null> {
  const { data: u } = await supabase.auth.getUser();
  const user = u.user;
  if (!user) return null;
  const [{ data: profile }, { data: roleRow }] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
  ]);
  const role = roleRow?.role;
  if (!isRole(role)) return null;
  const pending = profile ? await flushPendingAvatar(user.id, !!profile.avatar_path) : null;
  return {
    userId: user.id,
    email: user.email ?? profile?.email ?? "",
    firstName: profile?.first_name ?? "",
    lastName: profile?.last_name ?? "",
    role,
    status: profile?.status ?? "active",
    onboardingCompleted: profile?.onboarding_completed ?? false,
    avatarPath: pending ?? profile?.avatar_path ?? null,
  };
}
