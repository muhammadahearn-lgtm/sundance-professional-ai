import { supabase } from "@/integrations/supabase/client";

const SUFFIX = /\s(inc|incorporated|llc|l l c|ltd|limited|corp|corporation|co|company|plc|gmbh|sa|ag|bv|pty|pte)\s/g;

/** Mirror of the database company_key: lowercase, punctuation and legal suffixes removed, spaces dropped. */
export function companyKey(v: string): string {
  return (v.toLowerCase().replace(/[^a-z0-9& ]+/g, " ") + " ").replace(SUFFIX, " ").replace(/\s+/g, "");
}

/** Name offered on the "+ Add" button, or null when invalid or already listed ("Acme Inc." = "acme"). */
export function newCompanyName(input: string, options: { name: string }[]): string | null {
  const n = input.trim().replace(/\s+/g, " ");
  const k = companyKey(n);
  if (!k || n.length < 2 || n.length > 80) return null;
  if (options.some((o) => companyKey(o.name) === k)) return null;
  return n;
}

/** Links to an existing company with the same normalized name, or creates a new one. */
export async function addCompanyEntry(name: string): Promise<{ id: string; name: string }> {
  const { data, error } = await supabase.rpc("add_company_entry", { _name: name });
  if (error || !data) throw error ?? new Error("Couldn't add company");
  const list = await loadJobCompanies();
  return { id: data as string, name: list.find((c) => c.id === data)?.name ?? name };
}

/** Companies this recruiter can post for: their own, their profile company, and companies used on their jobs. */
export async function loadJobCompanies(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase.rpc("my_job_companies");
  if (error) throw error;
  return (data ?? []).map((c) => ({ id: c.company_id, name: c.company_name }));
}
