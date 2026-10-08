import { Monitor, Moon, Sun, Check } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme, type ThemePref } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ThemePref; label: string; hint: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", hint: "Bright and crisp", Icon: Sun },
  { value: "dark", label: "Dark", hint: "Easy on the eyes", Icon: Moon },
  { value: "system", label: "System", hint: "Match my device", Icon: Monitor },
];

/** Compact sun/moon toggle for headers. */
export function ThemeToggle({ className }: { className?: string }) {
  const { pref, setTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="Change appearance"
          className={cn("relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", className)}>
          <Sun className="h-[18px] w-[18px] rotate-0 scale-100 transition-transform duration-300 dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[18px] w-[18px] rotate-90 scale-0 transition-transform duration-300 dark:rotate-0 dark:scale-100" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Appearance</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map(({ value, label, hint, Icon }) => (
          <DropdownMenuItem key={value} onSelect={() => setTheme(value)} className="gap-3 py-2">
            <Icon className="h-4 w-4" />
            <div className="flex-1"><div className="text-sm font-medium">{label}</div><div className="text-xs text-muted-foreground">{hint}</div></div>
            {pref === value && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Mini({ dark }: { dark: boolean }) {
  const bg = dark ? "#0e1328" : "#ffffff";
  const side = dark ? "#151b38" : "#f4f6fb";
  const card = dark ? "#1b2245" : "#ffffff";
  const line = dark ? "#2a3260" : "#e3e7f0";
  const txt = dark ? "#c9d1ea" : "#c4cbdb";
  return (
    <svg viewBox="0 0 120 72" className="h-full w-full" aria-hidden>
      <rect width="120" height="72" fill={bg} />
      <rect width="30" height="72" fill={side} />
      <rect x="6" y="8" width="16" height="3" rx="1.5" fill="#2f5be0" />
      <rect x="6" y="18" width="18" height="2.5" rx="1.25" fill={txt} />
      <rect x="6" y="25" width="14" height="2.5" rx="1.25" fill={txt} />
      <rect x="38" y="10" width="40" height="5" rx="2.5" fill={dark ? "#e8ecf8" : "#151a33"} opacity=".85" />
      <rect x="38" y="22" width="74" height="40" rx="5" fill={card} stroke={line} />
      <rect x="45" y="30" width="30" height="3" rx="1.5" fill={txt} />
      <rect x="45" y="37" width="50" height="3" rx="1.5" fill={txt} />
      <rect x="45" y="48" width="22" height="7" rx="3.5" fill="#2f5be0" />
    </svg>
  );
}

/** Visual Light / Dark / System picker for the Settings page. */
export function AppearancePicker() {
  const { pref, setTheme } = useTheme();
  return (
    <div role="radiogroup" aria-label="Appearance" className="grid gap-3 sm:grid-cols-3">
      {OPTIONS.map(({ value, label, hint, Icon }) => {
        const active = pref === value;
        return (
          <button key={value} type="button" role="radio" aria-checked={active} onClick={() => setTheme(value)}
            className={cn("group overflow-hidden rounded-xl border-2 text-left transition-all",
              active ? "border-primary shadow-soft" : "border-border hover:border-primary/40")}>
            <div className="relative aspect-[5/3] overflow-hidden border-b border-border">
              {value === "system" ? (
                <div className="flex h-full">
                  <div className="h-full w-1/2 overflow-hidden"><div className="h-full w-[200%]"><Mini dark={false} /></div></div>
                  <div className="h-full w-1/2 overflow-hidden"><div className="h-full w-[200%] -translate-x-1/2"><Mini dark /></div></div>
                </div>
              ) : <Mini dark={value === "dark"} />}
              {active && <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-3 w-3" /></span>}
            </div>
            <div className="flex items-center gap-2.5 bg-card px-3 py-2.5">
              <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
              <div><div className="text-sm font-semibold">{label}</div><div className="text-xs text-muted-foreground">{hint}</div></div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
