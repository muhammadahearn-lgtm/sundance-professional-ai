import { useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const toDate = (s?: string | null) => {
  if (!s) return undefined;
  const d = parseISO(s);
  return isValid(d) ? d : undefined;
};

/** Uniform date field. Value/onChange use "yyyy-MM-dd" strings ("" = empty). */
export function DatePicker({
  value, onChange, placeholder = "Pick a date", disabled, min, max, className, "aria-label": ariaLabel, clearable = true,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean;
  min?: string; max?: string; className?: string; "aria-label"?: string; clearable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = toDate(value);
  const minD = toDate(min);
  const maxD = toDate(max);
  const year = new Date().getFullYear();
  return (
    <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <div className={cn("relative", className)}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label={ariaLabel}
            className={cn(
              "flex h-10 w-full items-center gap-2 rounded-xl border border-input bg-background pl-3 pr-9 text-left text-sm transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
              open && "border-primary ring-2 ring-ring/30",
              !selected && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{selected ? format(selected, "MMM d, yyyy") : placeholder}</span>
          </button>
        </PopoverTrigger>
        {clearable && selected && !disabled && (
          <button type="button" aria-label="Clear date" onClick={() => onChange("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <PopoverContent className="w-auto rounded-2xl p-0 shadow-lg" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? minD ?? maxD}
          onSelect={(d) => { onChange(d ? format(d, "yyyy-MM-dd") : ""); setOpen(false); }}
          captionLayout="dropdown"
          startMonth={new Date(1950, 0)}
          endMonth={new Date(year + 15, 11)}
          disabled={[...(minD ? [{ before: minD }] : []), ...(maxD ? [{ after: maxD }] : [])]}
          className="pointer-events-auto p-3"
          autoFocus
        />
        <div className="flex justify-between border-t border-border px-3 py-2">
          <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => { onChange(format(new Date(), "yyyy-MM-dd")); setOpen(false); }}>Today</button>
          {selected && <button type="button" className="text-xs font-semibold text-muted-foreground hover:text-foreground" onClick={() => { onChange(""); setOpen(false); }}>Clear</button>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
