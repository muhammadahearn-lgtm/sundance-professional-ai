/** Window outline with a left pane and a direction chevron; the pane fills in when the panel is open. */
export function PanelToggleIcon({ open, className = "h-4 w-4" }: { open: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="4" />
      <path d="M9 4v16" />
      {open && <rect x="3.9" y="4.9" width="4.2" height="14.2" rx="3" fill="currentColor" stroke="none" opacity={0.22} />}
      <path d={open ? "M16 10l-2 2 2 2" : "M14 10l2 2-2 2"} className="transition-transform duration-200 group-hover:-translate-x-px" />
    </svg>
  );
}

const base = "group inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/70 bg-background/80 text-muted-foreground shadow-sm transition-all hover:border-primary/40 hover:bg-primary-soft/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95";

/** Icon-only collapse/expand control. `open` = the panel is currently visible. */
export function PanelToggleButton({ open, label, onClick, size = "sm", className = "" }: { open: boolean; label: string; onClick: () => void; size?: "sm" | "md"; className?: string }) {
  const text = `${open ? "Hide" : "Show"} ${label}`;
  return (
    <button type="button" onClick={onClick} aria-label={text} title={text} aria-expanded={open}
      className={`${base} ${size === "md" ? "h-9 w-9" : "h-7 w-7"} ${className}`}>
      <PanelToggleIcon open={open} className={size === "md" ? "h-[18px] w-[18px]" : "h-4 w-4"} />
    </button>
  );
}

/** Labeled "Show filters" style button for collapsed panels. */
export function PanelShowButton({ label, count, onClick, className = "" }: { label: string; count?: number; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={`${base} h-9 px-3 text-sm font-semibold text-foreground ${className}`}>
      <PanelToggleIcon open={false} />{label}
      {!!count && <span className="rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground">{count}</span>}
    </button>
  );
}
