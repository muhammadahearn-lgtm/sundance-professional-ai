import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CAREER_MODES, type CareerMode } from "@/lib/market-pulse";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

/** Career mode (active / passive / not looking), passive pay floor, and hide-from-current-employer. */
export function CareerModeCard({ uid }: { uid: string }) {
  const qc = useQueryClient();
  const key = ["career-mode", uid];
  const q = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("candidate_profiles").select("career_mode, passive_min_salary, hide_from_current_employer, salary_currency").eq("user_id", uid).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [floor, setFloor] = useState<string | null>(null);
  async function save(patch: { career_mode?: string; passive_min_salary?: number | null; hide_from_current_employer?: boolean }) {
    qc.setQueryData(key, { ...q.data, ...patch });
    const { error } = await supabase.from("candidate_profiles").update(patch).eq("user_id", uid);
    if (error) { toast.error("Couldn't save."); void q.refetch(); } else toast.success("Saved");
  }
  if (q.isError) return <p className="text-sm text-destructive">Unable to load career mode.</p>;
  if (!q.data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const mode = q.data.career_mode as CareerMode;
  const floorVal = floor ?? (q.data.passive_min_salary ? String(q.data.passive_min_salary / 100) : "");
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        {CAREER_MODES.map((m) => (
          <button key={m.value} type="button" onClick={() => void save({ career_mode: m.value })} aria-pressed={mode === m.value}
            className={`rounded-xl border p-3 text-left transition ${mode === m.value ? "border-primary bg-primary-soft/50 ring-1 ring-primary/30" : "border-border hover:border-primary/40"}`}>
            <span className="block text-sm font-semibold">{m.label}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{m.desc}</span>
          </button>
        ))}
      </div>
      {mode === "passive" && (
        <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); const n = Math.round(Number(floorVal)); if (floorVal && (!Number.isFinite(n) || n < 0)) { toast.error("Enter a valid amount."); return; } void save({ passive_min_salary: floorVal ? n * 100 : null }); setFloor(null); }}>
          <label className="flex-1 space-y-1"><span className="block text-sm font-medium">Minimum yearly pay to consider ({q.data.salary_currency || "USD"})</span>
            <Input inputMode="numeric" placeholder="e.g. 165000" value={floorVal} onChange={(e) => setFloor(e.target.value.replace(/[^\d]/g, ""))} /></label>
          <Button type="submit" variant="outline" className="rounded-full">Save floor</Button>
        </form>
      )}
    </div>
  );
}
