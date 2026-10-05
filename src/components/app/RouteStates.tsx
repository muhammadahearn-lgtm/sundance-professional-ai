import { Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, Compass, Loader2, WifiOff } from "lucide-react";
import { reportLovableError } from "@/lib/lovable-error-reporting";

const box = "mx-auto my-10 max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-soft";
const primary = "inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90";
const secondary = "inline-flex items-center justify-center rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted";

/** Shown inside the page area (sidebar stays) when one screen fails. */
export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "route_error_component" }); }, [error]);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return (
    <div className={box} role="alert">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive">
        {offline ? <WifiOff className="h-6 w-6" aria-hidden /> : <AlertTriangle className="h-6 w-6" aria-hidden />}
      </div>
      <h1 className="mt-4 text-lg font-bold">{offline ? "You're offline" : "This page didn't load"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {offline ? "Check your internet connection, then try again." : "Something went wrong. Your saved information is safe — please try again."}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button type="button" className={primary} onClick={() => { void router.invalidate(); reset(); }}>Try again</button>
        <button type="button" className={secondary} onClick={() => router.history.back()}>Go back</button>
      </div>
    </div>
  );
}

export function RouteNotFound() {
  return (
    <div className={box}>
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary"><Compass className="h-6 w-6" aria-hidden /></div>
      <h1 className="mt-4 text-lg font-bold">Page not found</h1>
      <p className="mt-1 text-sm text-muted-foreground">This page doesn't exist or may have been removed.</p>
      <div className="mt-6"><Link to="/" className={primary}>Go to home</Link></div>
    </div>
  );
}

export function RoutePending() {
  return (
    <div className="grid min-h-[40vh] place-items-center" role="status" aria-live="polite">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** Thin banner when the connection drops, so empty screens aren't mistaken for "no data". */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  if (!offline) return null;
  return (
    <div role="status" aria-live="polite" className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground">
      <WifiOff className="h-4 w-4" aria-hidden /> You're offline — changes won't save until you reconnect.
    </div>
  );
}
