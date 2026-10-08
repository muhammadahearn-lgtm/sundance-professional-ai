import { useEffect, useState } from "react";

export type ThemePref = "light" | "dark" | "system";
export const THEME_KEY = "sundance-theme";
const EVENT = "sundance-theme-change";

export function parseTheme(v: unknown): ThemePref {
  return v === "light" || v === "dark" ? v : "system";
}

export function resolveTheme(pref: ThemePref, systemDark: boolean): "light" | "dark" {
  return pref === "system" ? (systemDark ? "dark" : "light") : pref;
}

/** Runs before first paint (inlined in <head>) so there is no white flash. */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_KEY}");var d=p==="dark"||(p!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

function apply(pref: ThemePref) {
  const dark = resolveTheme(pref, window.matchMedia("(prefers-color-scheme: dark)").matches) === "dark";
  const root = document.documentElement;
  root.classList.add("theme-switching");
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  window.setTimeout(() => root.classList.remove("theme-switching"), 50);
}

export function setTheme(pref: ThemePref) {
  try { localStorage.setItem(THEME_KEY, pref); } catch { /* storage blocked */ }
  apply(pref);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: pref }));
}

export function useTheme() {
  const [pref, setPref] = useState<ThemePref>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      let p: ThemePref = "system";
      try { p = parseTheme(localStorage.getItem(THEME_KEY)); } catch { /* ignore */ }
      setPref(p);
      setResolved(resolveTheme(p, mq.matches));
    };
    const onSystem = () => { sync(); let p: ThemePref = "system"; try { p = parseTheme(localStorage.getItem(THEME_KEY)); } catch { /* ignore */ } if (p === "system") apply("system"); };
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    mq.addEventListener("change", onSystem);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); mq.removeEventListener("change", onSystem); };
  }, []);
  return { pref, resolved, setTheme };
}
