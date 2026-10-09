/** Pure helpers for the Applications Requisition Hub (one triage card per job). */
export type AppReqRow = { job_id: string; candidate_id: string; application_status: string; application_date: string; title: string; jobStatus: string; location: string; company: string };
export type AppReq = { id: string; title: string; status: string; location: string; company: string; total: number; unreviewed: number; inPipeline: number; archived: number; topMatch: number | null; latest: string };

/** Unreviewed = still "applied" and not yet moved to the pipeline. Archived = rejected. */
export function summarizeApplications(rows: AppReqRow[], inPipe: (r: AppReqRow) => boolean, score: (r: AppReqRow) => number | undefined): AppReq[] {
  const m = new Map<string, AppReq>();
  for (const r of rows) {
    const j = m.get(r.job_id) ?? { id: r.job_id, title: r.title, status: r.jobStatus, location: r.location, company: r.company, total: 0, unreviewed: 0, inPipeline: 0, archived: 0, topMatch: null, latest: r.application_date };
    j.total++;
    const piped = inPipe(r);
    if (piped) j.inPipeline++;
    else if (r.application_status === "rejected") j.archived++;
    else if (r.application_status === "applied") j.unreviewed++;
    const s = score(r);
    if (typeof s === "number" && (j.topMatch === null || s > j.topMatch)) j.topMatch = s;
    if (r.application_date > j.latest) j.latest = r.application_date;
    m.set(r.job_id, j);
  }
  return [...m.values()];
}

/** "active" = not closed; "closed" = closed only; "all" = everything. */
export function filterAppReqs(list: AppReq[], f: { q: string; co: string; status: string }): AppReq[] {
  const q = f.q.trim().toLowerCase();
  return list.filter((j) => (!f.co || j.company === f.co) &&
    (f.status === "all" ? true : f.status === "closed" ? j.status === "closed" : j.status !== "closed") &&
    (!q || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q)));
}

/** Most unreviewed first, then most recent applicant, then title. */
export function sortAppReqs(list: AppReq[]): AppReq[] {
  return [...list].sort((a, b) => b.unreviewed - a.unreviewed || b.latest.localeCompare(a.latest) || a.title.localeCompare(b.title));
}
