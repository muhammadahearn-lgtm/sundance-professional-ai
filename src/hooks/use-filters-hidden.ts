import { useEffect, useState } from "react";

/** Remembers (per browser) whether the search filter panel is hidden on desktop. */
export function useFiltersHidden(key: string) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => { if (localStorage.getItem(key) === "1") setHidden(true); }, [key]);
  return [hidden, (v: boolean) => { setHidden(v); localStorage.setItem(key, v ? "1" : "0"); }] as const;
}
