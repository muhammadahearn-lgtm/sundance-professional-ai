import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SearchPicker } from "@/components/taxonomy/SearchPicker";
import { inputCls } from "@/components/profile/parts";
import { formatLocation, normalizeLocationPart, type LocationParts } from "@/lib/location";

export function useCountries() {
  return useQuery({
    queryKey: ["countries"],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.from("countries").select("country_name, sort_order").order("sort_order").order("country_name");
      if (error) throw error;
      return (data ?? []).map((c) => c.country_name);
    },
  });
}

const lab = "mb-1.5 block text-sm font-medium";

/** Country (controlled list) + State / Province + City (free text, normalized on blur). */
export function LocationFields({ value, onChange, required, error, showPreview = true }: {
  value: LocationParts; onChange: (v: LocationParts) => void; required?: boolean; error?: string | undefined; showPreview?: boolean;
}) {
  const countries = useCountries().data ?? [];
  const star = required ? " *" : "";
  const preview = formatLocation(value);
  return (
    <div className="space-y-2 sm:col-span-2">
      <div className="grid gap-4 sm:grid-cols-3">
        <div><span className={lab}>Country{star}</span>
          <SearchPicker ariaLabel="Country" options={countries.map((c) => ({ id: c, name: c }))} value={value.country} onChange={(c) => onChange({ ...value, country: c })} placeholder="Search countries…" emptyLabel="Select country" />
        </div>
        <label><span className={lab}>State / Province{star}</span>
          <input className={inputCls} maxLength={80} value={value.state} placeholder="e.g. New Hampshire" onChange={(e) => onChange({ ...value, state: e.target.value })} onBlur={() => onChange({ ...value, state: normalizeLocationPart(value.state) })} />
        </label>
        <label><span className={lab}>City{star}</span>
          <input className={inputCls} maxLength={80} value={value.city} placeholder="e.g. Bow" onChange={(e) => onChange({ ...value, city: e.target.value })} onBlur={() => onChange({ ...value, city: normalizeLocationPart(value.city) })} />
        </label>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : showPreview && preview ? <p className="text-xs text-muted-foreground">Shown as: <span className="font-medium text-foreground">{preview}</span></p> : null}
    </div>
  );
}
