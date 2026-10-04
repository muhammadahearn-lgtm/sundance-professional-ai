import { APP_STATUSES } from "./talent-rules";

export type AppLite = { application_id: string; application_date: string; application_status: string; updated_at: string; job_title: string };

/** Active = still in progress (not hired or rejected). */
export function applicationMetrics(apps: AppLite[], now = new Date()) {
  const y = now.getUTCFullYear(), m = now.getUTCMonth();
  const count = (s: string) => apps.filter((a) => a.application_status === s).length;
  return {
    total: apps.length,
    thisMonth: apps.filter((a) => { const d = new Date(a.application_date); return d.getUTCFullYear() === y && d.getUTCMonth() === m; }).length,
    active: apps.filter((a) => a.application_status !== "hired" && a.application_status !== "rejected").length,
    offers: count("offer"),
    hires: count("hired"),
    rejected: count("rejected"),
  };
}

export function statusBreakdown(apps: AppLite[]) {
  return APP_STATUSES.map(([key, label]) => ({ key, label, n: apps.filter((a) => a.application_status === key).length }));
}

export type Activity = { at: string; text: string; kind: "application" | "recruiter" | "saved" | "profile" };

const label = (s: string) => APP_STATUSES.find(([k]) => k === s)?.[1] ?? s;

export function buildActivity(input: {
  apps: AppLite[];
  saved: { saved_date: string; job_title: string }[];
  skills: { created_at: string; name: string }[];
  certs: { created_at: string; certification_name: string }[];
  profileUpdatedAt: string | null;
}): Activity[] {
  const out: Activity[] = [];
  for (const a of input.apps) {
    out.push({ at: a.application_date, text: `Applied to ${a.job_title}`, kind: "application" });
    if (a.application_status !== "applied") out.push({ at: a.updated_at, text: `${a.job_title}: ${label(a.application_status)}`, kind: "recruiter" });
  }
  for (const s of input.saved) out.push({ at: s.saved_date, text: `Saved ${s.job_title}`, kind: "saved" });
  for (const s of input.skills) out.push({ at: s.created_at, text: `Added skill ${s.name}`, kind: "profile" });
  for (const c of input.certs) out.push({ at: c.created_at, text: `Added certification ${c.certification_name}`, kind: "profile" });
  if (input.profileUpdatedAt) out.push({ at: input.profileUpdatedAt, text: "Updated profile", kind: "profile" });
  return out.sort((a, b) => b.at.localeCompare(a.at));
}
