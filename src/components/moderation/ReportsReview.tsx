import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { REPORT_REASONS, TARGET_LABEL, canRestrict, type ReportStatus, type ReportTarget } from "@/lib/reports";

const STATUSES: ReportStatus[] = ["open", "reviewing", "resolved", "dismissed"];

async function loadReports() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { allowed: false, rows: [] };
  const { data: ok } = await supabase.rpc("is_moderator", { _uid: u.user.id });
  if (!ok) return { allowed: false, rows: [] };
  const { data, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) throw error;
  return { allowed: true, rows: data ?? [] };
}

export function ReportsReview() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["moderation-reports"], queryFn: loadReports });
  const [tab, setTab] = useState<ReportStatus>("open");
  const [notes, setNotes] = useState<Record<string, string>>({});

  if (q.isLoading) return <Shell><p className="text-sm text-muted-foreground">Loading reports…</p></Shell>;
  if (q.isError) return <Shell><p className="text-sm text-destructive">Reports couldn't load. <button className="underline" onClick={() => q.refetch()}>Try again</button></p></Shell>;
  if (!q.data?.allowed) return (
    <Shell><div className="rounded-2xl border border-border bg-card p-8 text-center"><ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-semibold">This area is for the Sundance Professionals review team.</p><Link to="/" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">Go home</Link></div></Shell>
  );
  const rows = q.data.rows.filter((r) => r.status === tab);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, q.data.rows.filter((r) => r.status === s).length]));

  async function setStatus(id: string, status: ReportStatus) {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("reports").update({ status, resolution_note: (notes[id] ?? "").slice(0, 1000), reviewed_by: u.user?.id ?? null, reviewed_at: new Date().toISOString() }).eq("report_id", id);
    if (error) return toast.error("Couldn't update the report.");
    toast.success(`Report marked ${status}.`);
    qc.invalidateQueries({ queryKey: ["moderation-reports"] });
  }
  async function restrict(type: ReportTarget, target: string, on: boolean) {
    const { error } = await supabase.rpc("moderate_restrict", { _type: type, _target: target, _restrict: on });
    if (error) return toast.error("Couldn't change the restriction.");
    toast.success(type === "user" ? (on ? "Account suspended." : "Account restored.") : (on ? "Job paused." : "Job reactivated."));
  }

  return (
    <Shell>
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setTab(s)} aria-pressed={tab === s} className={`rounded-full border px-4 py-1.5 text-sm font-semibold capitalize ${tab === s ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{s} ({counts[s]})</button>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground"><Flag className="mx-auto mb-2 h-6 w-6" />No {tab} reports.</div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const type = r.target_type as ReportTarget;
            return (
              <li key={r.report_id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 font-semibold text-destructive">{REPORT_REASONS.find((x) => x.value === r.reason)?.label ?? r.reason}</span>
                  <span className="font-semibold">{TARGET_LABEL[type]}</span>
                  <code className="text-xs text-muted-foreground">{r.target_id}</code>
                  <span className="ml-auto text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                </div>
                {r.details && <p className="mt-2 whitespace-pre-wrap text-sm">{r.details}</p>}
                {r.resolution_note && tab !== "open" && <p className="mt-2 text-xs text-muted-foreground">Note: {r.resolution_note}</p>}
                <Textarea className="mt-3" placeholder="Internal note (optional)" value={notes[r.report_id] ?? ""} onChange={(e) => setNotes({ ...notes, [r.report_id]: e.target.value })} />
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.status !== "reviewing" && <Button size="sm" variant="outline" onClick={() => setStatus(r.report_id, "reviewing")}>Mark reviewing</Button>}
                  {r.status !== "resolved" && <Button size="sm" onClick={() => setStatus(r.report_id, "resolved")}>Resolve</Button>}
                  {r.status !== "dismissed" && <Button size="sm" variant="ghost" onClick={() => setStatus(r.report_id, "dismissed")}>Dismiss</Button>}
                  {canRestrict(type) && <>
                    <Button size="sm" variant="destructive" onClick={() => restrict(type, r.target_id, true)}>{type === "user" ? "Suspend account" : "Pause job"}</Button>
                    <Button size="sm" variant="outline" onClick={() => restrict(type, r.target_id, false)}>{type === "user" ? "Restore account" : "Reactivate job"}</Button>
                  </>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-2xl font-extrabold">Report Review</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">Review reports about jobs, accounts and conversations.</p>
      {children}
    </main>
  );
}
