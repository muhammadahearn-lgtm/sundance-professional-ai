import { supabase } from "@/integrations/supabase/client";
import { taxonomyDisplay, taxonomyKey } from "./taxonomy";

export type TaxonomyKind = "language" | "skill" | "technology" | "soft_skill";

/** Name shown on the "+ Add" button, or null when the typed text matches an existing option. */
export function newEntryName(input: string, options: { name: string }[]): string | null {
  const k = taxonomyKey(input);
  if (!k || input.trim().length > 60) return null;
  return options.some((o) => taxonomyKey(o.name) === k) ? null : taxonomyDisplay(input);
}

/** Creates (or reuses) a shared list entry; the database normalizes the name. */
export async function addTaxonomyEntry(kind: TaxonomyKind, name: string): Promise<string> {
  const { data, error } = await supabase.rpc("add_taxonomy_entry", { _kind: kind, _name: name });
  if (error || !data) throw error ?? new Error("Couldn't add entry");
  return data as string;
}
