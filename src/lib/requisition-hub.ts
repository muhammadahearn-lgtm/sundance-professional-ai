/** Pure helpers for the Pipeline Requisition Hub (one card per job). */
export type HubJob = { id: string; title: string; status: string; location: string; companyId: string; company: string };
export type HubRow = { job_id: string | null; current_stage: string };
export type HubOffer = { job_id: string; status: string; negotiated_at: string | null };
export type HubSummary = HubJob & { total: number; stages: Record<string, number>; pendingOffers: number; negotiating: number; needsSchedule: number };

export const HUB_STAGES: [string, string][] = [["contacted", "Contacted"], ["interviewing", "Interviewing"], ["shortlisted", "Shortlisted"], ["offer", "Offer"], ["hired", "Hired"]];

export function summarizeJobs(jobs: HubJob[], rows: HubRow[], offers: HubOffer[], scheduledByJob: Record<string, number> = {}): HubSummary[] {
  return jobs.map((j) => {
    const mine = rows.filter((r) => r.job_id === j.id);
    const stages: Record<string, number> = {};
    for (const r of mine) stages[r.current_stage] = (stages[r.current_stage] ?? 0) + 1;
    const open = offers.filter((o) => o.job_id === j.id && o.status === "pending");
    const interviewing = stages["interviewing"] ?? 0;
    return {
      ...j,
      total: mine.filter((r) => r.current_stage !== "rejected").length,
      stages,
      pendingOffers: open.length,
      negotiating: open.filter((o) => o.negotiated_at).length,
      needsSchedule: Math.max(0, interviewing - (scheduledByJob[j.id] ?? 0)),
    };
  });
}

/** Status filter: "active" shows published + paused; "closed" closed only; "all" everything. */
export function filterHub(list: HubSummary[], f: { q: string; co: string; status: string }): HubSummary[] {
  const q = f.q.trim().toLowerCase();
  return list.filter((j) =>
    (!f.co || j.companyId === f.co) &&
    (f.status === "all" ? true : f.status === "closed" ? j.status === "closed" : j.status !== "closed") &&
    (!q || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q)));
}

/** Jobs needing attention first, then by candidate volume, then title. */
export function sortHub(list: HubSummary[]): HubSummary[] {
  const att = (j: HubSummary) => j.negotiating * 3 + j.pendingOffers * 2 + j.needsSchedule;
  return [...list].sort((a, b) => att(b) - att(a) || b.total - a.total || a.title.localeCompare(b.title));
}
