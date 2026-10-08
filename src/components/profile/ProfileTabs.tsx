import { useEffect, useState, type ReactNode } from "react";

export type ProfileTab<K extends string> = { key: K; label: string; icon: ReactNode; incomplete?: boolean };

/** Tab state mirrored to ?tab= so reminders and links can deep-link a section. */
export function useProfileTab<K extends string>(keys: readonly K[], fallback: K) {
  const [tab, setTab] = useState<K>(fallback);
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab") as K | null;
    if (t && keys.includes(t)) setTab(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const select = (k: K) => {
    setTab(k);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", k);
    window.history.replaceState(window.history.state, "", url);
  };
  return [tab, select] as const;
}

export function ProfileTabBar<K extends string>({ tabs, value, onChange }: { tabs: ProfileTab<K>[]; value: K; onChange: (k: K) => void }) {
  return (
    <div className="sticky top-0 z-20 -mx-1 bg-background/90 px-1 py-2 backdrop-blur">
      <div role="tablist" aria-label="Profile sections" className="flex gap-2 overflow-x-auto rounded-2xl border border-border bg-card p-1.5">
        {tabs.map((t) => {
          const on = t.key === value;
          return (
            <button key={t.key} role="tab" aria-selected={on} type="button" onClick={() => onChange(t.key)}
              className={`relative inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              {t.icon}{t.label}
              {t.incomplete && <span title="Something left to add" className={`h-2 w-2 rounded-full ${on ? "bg-primary-foreground" : "bg-warning"}`} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
