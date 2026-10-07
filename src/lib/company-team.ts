import { supabase } from "@/integrations/supabase/client";

export type CompanyRole = "admin" | "member";
export type TeamMember = { user_id: string; role: CompanyRole; name: string; created_at: string };
export type AdminRequest = { request_id: string; user_id: string; name: string; created_at: string };

/** True when uid is the company's only admin — they cannot leave, be demoted, or be removed. */
export function isLastAdmin(members: { user_id: string; role: string }[], uid: string): boolean {
  const me = members.find((m) => m.user_id === uid);
  return me?.role === "admin" && members.filter((m) => m.role === "admin").length === 1;
}

/** What a member may do to another member. */
export function canDemote(actor: CompanyRole, target: TeamMember, members: TeamMember[]): boolean {
  return actor === "admin" && target.role === "admin" && !isLastAdmin(members, target.user_id);
}
export function canRemove(actor: CompanyRole, actorId: string, target: TeamMember, members: TeamMember[]): boolean {
  return actor === "admin" && target.user_id !== actorId && !isLastAdmin(members, target.user_id);
}

export async function loadTeam(companyId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase.rpc("company_team", { _company: companyId });
  if (error) throw error;
  return (data ?? []).map((r) => ({ user_id: r.user_id, role: r.role as CompanyRole, name: r.name, created_at: r.created_at }));
}

export async function loadPendingRequests(companyId: string): Promise<AdminRequest[]> {
  const { data, error } = await supabase.rpc("company_pending_admin_requests", { _company: companyId });
  if (error) throw error;
  return (data ?? []).map((r) => ({ request_id: r.request_id, user_id: r.user_id, name: r.name, created_at: r.created_at }));
}

export type RequestStatus = "pending" | "approved" | "denied";
export type RequestRecord = { request_id: string; user_id: string; name: string; status: RequestStatus; created_at: string; resolved_at: string | null; resolved_by_name: string | null };
export type InboxTab = "pending" | "approved" | "denied" | "all";

/** Full request history (admins: whole company; members: their own). */
export async function loadRequestHistory(companyId: string): Promise<RequestRecord[]> {
  const { data, error } = await supabase.rpc("company_admin_request_history", { _company: companyId });
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, status: r.status as RequestStatus }));
}

export function filterInbox(list: RequestRecord[], tab: InboxTab): RequestRecord[] {
  return tab === "all" ? list : list.filter((r) => r.status === tab);
}

export function inboxCounts(list: RequestRecord[]): Record<InboxTab, number> {
  const c = { pending: 0, approved: 0, denied: 0, all: list.length };
  for (const r of list) c[r.status]++;
  return c;
}

/** My pending admin request for a company, if any. */
export async function myPendingRequest(companyId: string, uid: string): Promise<boolean> {
  const { data, error } = await supabase.from("company_admin_requests").select("request_id").eq("company_id", companyId).eq("user_id", uid).eq("status", "pending").maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function requestAdminAccess(companyId: string, uid: string): Promise<void> {
  const { error } = await supabase.from("company_admin_requests").insert({ company_id: companyId, user_id: uid });
  if (error) throw new Error(error.code === "23505" ? "You already have a pending request for this company." : "Couldn't send the request. Please try again.");
}

export async function resolveRequest(requestId: string, status: "approved" | "denied", uid: string): Promise<void> {
  const { error } = await supabase.from("company_admin_requests").update({ status, resolved_at: new Date().toISOString(), resolved_by: uid }).eq("request_id", requestId);
  if (error) throw new Error("Couldn't update the request. Please try again.");
}

export async function setMemberRole(companyId: string, userId: string, role: CompanyRole): Promise<void> {
  const { error } = await supabase.from("company_members").update({ role, updated_at: new Date().toISOString() }).eq("company_id", companyId).eq("user_id", userId);
  if (error) throw new Error(error.message.includes("at least one admin") ? "A company needs at least one admin. Promote another member first." : "Couldn't update that member. Please try again.");
}

export async function removeMember(companyId: string, userId: string): Promise<void> {
  const { error } = await supabase.from("company_members").delete().eq("company_id", companyId).eq("user_id", userId);
  if (error) throw new Error(error.message.includes("at least one admin") ? "A company needs at least one admin. Promote another member first." : "Couldn't remove that member. Please try again.");
}
