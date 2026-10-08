import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TextPicker } from "@/components/taxonomy/TextPicker";
import { SPOKEN_LANGUAGE_LEVELS, spokenLanguageLevelLabel, type SpokenLanguageLevel } from "@/lib/standard-resume";
import { SPOKEN_LANGUAGE_CATALOG, normalizeSpokenLanguage } from "@/lib/spoken-languages";
import { friendlyError, inputCls } from "./parts";

export type SpokenLanguage = { spoken_language_id: string; language_name: string; proficiency: string };
const COMMON = SPOKEN_LANGUAGE_CATALOG;

export function SpokenLanguagesManager({ uid, items, adding, setAdding }: { uid: string; items: SpokenLanguage[]; adding: boolean; setAdding: (v: boolean) => void }) {
  const qc = useQueryClient(); const [name, setName] = useState(""); const [level, setLevel] = useState<SpokenLanguageLevel>("professional"); const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["candidate-full", uid] });
  async function add() {
    const clean = normalizeSpokenLanguage(name); if (items.some((i) => i.language_name.toLowerCase() === clean.toLowerCase())) { toast.error(`${clean} is already on your list.`); return; } if (clean.length < 2) { toast.error("Enter a spoken language."); return; }
    setBusy(true); const { error } = await supabase.from("candidate_spoken_languages").insert({ candidate_id: uid, language_name: clean, proficiency: level }); setBusy(false);
    if (error) { toast.error(friendlyError(error, "Couldn't add that language.")); return; }
    toast.success("Spoken language added"); setName(""); setAdding(false); void refresh();
  }
  async function remove(id: string) { const { error } = await supabase.from("candidate_spoken_languages").delete().eq("spoken_language_id", id); if (error) { toast.error("Couldn't remove that language."); return; } toast.success("Spoken language removed"); void refresh(); }
  return <div className="space-y-4">
    {adding && <div className="grid gap-3 rounded-xl border border-primary/30 bg-primary-soft/30 p-4 sm:grid-cols-[1fr_200px_auto]">
      <TextPicker ariaLabel="Spoken language" options={COMMON.filter((x) => !items.some((i) => i.language_name.toLowerCase() === x.toLowerCase()))} value={name} onChange={(v) => setName(normalizeSpokenLanguage(v))} placeholder="Search or add a language…" addHint="Not listed? Add the language you speak." />
      <select aria-label="Spoken language proficiency" className={inputCls} value={level} onChange={(e) => setLevel(e.target.value as SpokenLanguageLevel)}>{SPOKEN_LANGUAGE_LEVELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      <div className="flex gap-2"><button type="button" onClick={() => setAdding(false)} className="rounded-xl border border-border px-3 py-2 text-sm font-semibold">Cancel</button><button type="button" onClick={add} disabled={busy} className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Add</button></div>
    </div>}
    {items.length ? <ul className="divide-y divide-border rounded-xl border border-border">{items.map((item) => <li key={item.spoken_language_id} className="flex items-center gap-3 p-3"><span className="flex-1 text-sm font-semibold">{item.language_name}</span><span className="text-sm text-muted-foreground">{spokenLanguageLevelLabel(item.proficiency)}</span><button type="button" aria-label={`Remove ${item.language_name}`} onClick={() => remove(item.spoken_language_id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 className="h-4 w-4" /></button></li>)}</ul> : !adding && <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No spoken languages added yet.</p>}
  </div>;
}

export function SpokenLanguageAddButton({ onClick }: { onClick: () => void }) { return <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold hover:border-primary hover:text-primary"><Plus className="h-4 w-4" />Add Language</button>; }
