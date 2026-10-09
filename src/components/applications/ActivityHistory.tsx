import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { describeEvent, loadApplicationHistory, type EventTone } from "@/lib/application-history";

const DOT: Record<EventTone, string> = { neutral: "bg-primary", good: "bg-success", warn: "bg-warning", bad: "bg-destructive" };

/** Recruiter-only chronological audit trail for one application. */
export function ActivityHistory({ applicationId }: { applicationId: string }) {
  const q = useQuery({ queryKey: ["application-history", applicationId], queryFn: () => loadApplicationHistory(applicationId) });
  const rows = q.data ?? [];
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <p className="flex items-center gap-2 font-display font-bold"><History className="h-4 w-4 text-primary" />Activity History</p>
      <p className="mb-3 text-xs text-muted-foreground">Every step on this application, newest first. Only your hiring team can see this.</p>
      {q.isLoading ? <div className="h-24 animate-pulse rounded-xl bg-muted" /> : q.isError ? <p className="text-sm text-destructive">Couldn't load the history.</p> : !rows.length ? <p className="text-sm text-muted-foreground">No activity yet.</p> : (
        <ol className="relative max-h-96 space-y-3 overflow-y-auto border-l border-border pl-4">
          {rows.map((e) => { const d = describeEvent(e); return (
            <li key={e.event_id} className="relative">
              <span className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-card ${DOT[d.tone]}`} />
              <p className="text-sm font-semibold leading-tight">{d.title}</p>
              {d.sub && <p className="text-xs text-muted-foreground">{d.sub}</p>}
              <p className="text-[11px] text-muted-foreground">{new Date(e.occurred_at).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</p>
            </li>
          ); })}
        </ol>
      )}
    </section>
  );
}
