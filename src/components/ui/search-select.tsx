import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

export type SearchOption = { value: string; label: string };

/** Dropdown with a type-to-filter search box. Empty value = the "all" option. */
export function SearchSelect({ value, onChange, options, allLabel, placeholder, ariaLabel, className }: {
  value: string; onChange: (v: string) => void; options: SearchOption[];
  allLabel: string; placeholder: string; ariaLabel: string; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label ?? allLabel;
  const pick = (v: string) => { onChange(v); setOpen(false); };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" role="combobox" aria-expanded={open} aria-label={ariaLabel}
          className={cn("flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-input bg-background px-3 text-left text-sm hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}>
          <span className={cn("truncate", !value && "text-muted-foreground")}>{current}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              <CommandItem value={`__all ${allLabel}`} onSelect={() => pick("")}>
                <Check className={cn("mr-2 h-4 w-4", value ? "opacity-0" : "opacity-100")} />{allLabel}
              </CommandItem>
              {options.map((o) => (
                <CommandItem key={o.value} value={`${o.label} ${o.value}`} onSelect={() => pick(o.value)}>
                  <Check className={cn("mr-2 h-4 w-4", value === o.value ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{o.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
