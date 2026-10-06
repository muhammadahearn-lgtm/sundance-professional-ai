import { supabase } from "@/integrations/supabase/client";
import { taxonomyKey } from "./taxonomy";

const LEVEL_PREFIX = /^(?:(?:junior|jr\.?|mid[- ]?level|mid|senior|sr\.?|lead|staff|principal|entry[- ]level|associate|intern)\s+)+/i;

/** Removes seniority words — seniority belongs in the Level field, not the role name. */
export function stripLevelPrefix(input: string): string {
  return input.trim().replace(LEVEL_PREFIX, "").trim();
}

/** Role name offered on the "+ Add" button, or null when it is empty, too long, or already listed. */
export function newRoleName(input: string, options: { name: string }[]): string | null {
  const base = stripLevelPrefix(input);
  const k = taxonomyKey(base);
  if (!k || base.length < 2 || base.length > 60) return null;
  if (options.some((o) => taxonomyKey(o.name) === k)) return null;
  return base.replace(/\s+/g, " ").split(" ").map((w) => (w === w.toUpperCase() && w.length > 1 ? w : w[0].toUpperCase() + w.slice(1))).join(" ");
}

/** Adds (or reuses) a role in the shared list; the database dedupes and normalizes. */
export async function addRoleEntry(name: string): Promise<{ id: string; name: string; category: string }> {
  const { data, error } = await supabase.rpc("add_role_entry", { _name: name });
  if (error || !data) throw error ?? new Error("Couldn't add role");
  const { data: row } = await supabase.from("roles").select("role_id, role_name, category").eq("role_id", data as string).maybeSingle();
  return { id: data as string, name: row?.role_name ?? name, category: row?.category ?? "Other Tech Roles" };
}
