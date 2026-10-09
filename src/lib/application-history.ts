import { supabase } from "@/integrations/supabase/client";

export type AppEvent = { event_id: string; kind: string; detail: string; actor_id: string | null; occurred_at: string };

const STAGES: Record<string, string> = { saved: "Saved", contacted: "Contacted", interviewing: "Interviewing", shortlisted: "Shortlisted", offer: "Offer", hired: "Hired", rejected: "Not Moving Forward" };
const STATUSES: Record<string, string> = { applied: "Applied", viewed: "Viewed", reviewing: "In Review", interviewing: "Interviewing", offered: "Offered", hired: "Hired", rejected: "Not Moving Forward" };
const cap = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1).replace(/_/g, " ") : s);
const when = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); };
/** "Round 2 · 2026-10-09T15:00:00Z" → "Round 2 · Oct 9, 3:00 PM" */
const round = (d: string) => d.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/, (m) => when(m));

export type EventTone = "neutral" | "good" | "warn" | "bad";

/** Plain-language label for one history entry. */
export function describeEvent(e: Pick<AppEvent, "kind" | "detail">): { title: string; sub: string; tone: EventTone } {
  const d = e.detail ?? "";
  switch (e.kind) {
    case "applied": return { title: "Applied", sub: "", tone: "neutral" };
    case "stage": {
      const [to, from] = d.split(" from ");
      return { title: `Moved to ${STAGES[to!] ?? cap(to!)}`, sub: from ? `from ${STAGES[from] ?? cap(from)}` : "", tone: to === "hired" ? "good" : to === "rejected" ? "bad" : "neutral" };
    }
    case "status": {
      const [s, reason] = d.split(" · ");
      return { title: `Status: ${STATUSES[s!] ?? cap(s!)}`, sub: reason ?? "", tone: s === "hired" ? "good" : s === "rejected" ? "bad" : "neutral" };
    }
    case "interview_scheduled": return { title: "Interview scheduled", sub: round(d), tone: "neutral" };
    case "interview_rescheduled": return { title: "Interview rescheduled", sub: round(d), tone: "warn" };
    case "interview_cancelled": return { title: "Interview cancelled", sub: d, tone: "bad" };
    case "reschedule_requested": return { title: "Candidate asked to reschedule", sub: d, tone: "warn" };
    case "offer_sent": return { title: "Offer sent", sub: d, tone: "neutral" };
    case "offer_revised": return { title: "Offer revised", sub: d, tone: "neutral" };
    case "offer_accepted": return { title: "Offer accepted", sub: "", tone: "good" };
    case "offer_declined": return { title: "Offer declined", sub: d, tone: "bad" };
    case "offer_withdrawn": return { title: "Offer withdrawn", sub: d, tone: "bad" };
    case "offer_expired": return { title: "Offer expired", sub: "", tone: "warn" };
    case "offer_negotiation": return { title: "Candidate asked to discuss the offer", sub: "", tone: "warn" };
    case "offer_deadline": return { title: "Offer deadline changed", sub: d === "none" ? "No deadline" : `New deadline ${d}`, tone: "warn" };
    case "offer_extension": return { title: `Extension ${d === "pending" ? "requested" : d}`, sub: "", tone: d === "granted" ? "good" : "warn" };
    case "withdrawn": return { title: "Candidate withdrew", sub: cap(d), tone: "bad" };
    case "reneged": return { title: "Backed out after hire", sub: cap(d), tone: "bad" };
    default: return { title: cap(e.kind), sub: d, tone: "neutral" };
  }
}

/** Newest first; drops back-to-back duplicates (e.g. a stage move and its mirrored status change at the same moment). */
export function orderHistory<T extends AppEvent>(rows: T[]): T[] {
  const sorted = [...rows].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  return sorted.filter((e, i) => {
    const p = sorted[i - 1];
    return !p || p.kind !== e.kind || p.detail !== e.detail || Math.abs(new Date(p.occurred_at).getTime() - new Date(e.occurred_at).getTime()) > 2000;
  });
}

/** Job owner only (RLS). */
export async function loadApplicationHistory(applicationId: string): Promise<AppEvent[]> {
  const { data, error } = await supabase.from("application_events").select("event_id, kind, detail, actor_id, occurred_at").eq("application_id", applicationId).order("occurred_at", { ascending: false }).limit(200);
  if (error) throw error;
  return orderHistory(data ?? []);
}
