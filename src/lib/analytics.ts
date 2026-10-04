// Pure analytics helpers. Inputs are plain rows; no I/O.

export const RANGES = { "7d": "Last 7 Days", "30d": "Last 30 Days", "90d": "Last 90 Days", year: "This Year", all: "All Time", custom: "Custom Range" } as const;
export type RangeKey = keyof typeof RANGES;
export type DateWindow = { from: Date | null; to: Date | null };

export function windowFor(range: RangeKey, now = new Date(), custom?: { from?: string | undefined; to?: string | undefined }): DateWindow {
  const d = (n: number) => new Date(now.getTime() - n * 864e5);
  switch (range) {
    case "7d": return { from: d(7), to: null };
    case "30d": return { from: d(30), to: null };
    case "90d": return { from: d(90), to: null };
    case "year": return { from: new Date(now.getFullYear(), 0, 1), to: null };
    case "custom": return {
      from: custom?.from ? new Date(`${custom.from}T00:00:00`) : null,
      to: custom?.to ? new Date(`${custom.to}T23:59:59.999`) : null,
    };
    default: return { from: null, to: null };
  }
}

export function inWindow(iso: string | null | undefined, w: DateWindow): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return (!w.from || t >= w.from.getTime()) && (!w.to || t <= w.to.getTime());
}

export const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);
export const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

/** Counts per calendar month for the last `months` months, oldest first. */
export function byMonth(dates: string[], now = new Date(), months = 6): { month: string; count: number }[] {
  const out: { key: string; month: string; count: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ key: `${m.getFullYear()}-${m.getMonth()}`, month: m.toLocaleDateString("en-US", { month: "short" }), count: 0 });
  }
  for (const iso of dates) {
    const t = new Date(iso);
    const row = out.find((r) => r.key === `${t.getFullYear()}-${t.getMonth()}`);
    if (row) row.count++;
  }
  return out.map(({ month, count }) => ({ month, count }));
}

/** Sorted [label, count] pairs, largest first. */
export function tally<T>(rows: T[], key: (r: T) => string | null | undefined, limit = 8): { name: string; value: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) { const k = key(r) || "Unknown"; m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, limit);
}

export function matchStats(scores: number[]) {
  if (!scores.length) return { average: 0, highest: 0, lowest: 0, count: 0 };
  return { average: avg(scores), highest: Math.round(Math.max(...scores)), lowest: Math.round(Math.min(...scores)), count: scores.length };
}

export function matchDistribution(scores: number[]) {
  const b = [["90%+", 90, 101], ["75–89%", 75, 90], ["60–74%", 60, 75], ["Below 60%", -1, 60]] as const;
  return b.map(([name, lo, hi]) => ({ name, value: scores.filter((s) => s >= lo && s < hi).length }));
}

// ---------- Hiring funnel ----------
export const FUNNEL = ["Applications", "Contacted", "Interviewed", "Shortlisted", "Offer", "Hired"] as const;
const STATUS_RANK: Record<string, number> = { applied: 0, viewed: 0, recruiter_contacted: 1, interviewing: 2, offer: 4, hired: 5, rejected: 0 };
const STAGE_RANK: Record<string, number> = { saved: 0, contacted: 1, interviewing: 2, shortlisted: 3, offer: 4, hired: 5, rejected: 0 };

/** Each item is one candidate–job pair; furthest progress from either the application status or the pipeline stage. */
export function funnel(items: { status?: string | null | undefined; stage?: string | null | undefined; applied: boolean }[]) {
  const counts = FUNNEL.map(() => 0);
  for (const it of items) {
    const rank = Math.max(STATUS_RANK[it.status ?? ""] ?? 0, STAGE_RANK[it.stage ?? ""] ?? 0);
    if (!it.applied && rank === 0) continue;
    for (let i = 0; i <= rank; i++) counts[i]!++;
  }
  return FUNNEL.map((name, i) => ({ name, value: counts[i]! }));
}

export function conversions(f: { name: string; value: number }[]) {
  const v = (n: string) => f.find((x) => x.name === n)?.value ?? 0;
  return [
    { name: "Application To Contact", value: pct(v("Contacted"), v("Applications")) },
    { name: "Contact To Interview", value: pct(v("Interviewed"), v("Contacted")) },
    { name: "Interview To Offer", value: pct(v("Offer"), v("Interviewed")) },
    { name: "Offer To Hire", value: pct(v("Hired"), v("Offer")) },
    { name: "Overall Hire Rate", value: pct(v("Hired"), v("Applications")) },
  ];
}

/** Average whole days from application to hire. */
export function avgDaysToHire(pairs: { applied: string; hired: string }[]): number | null {
  if (!pairs.length) return null;
  return avg(pairs.map((p) => Math.max(0, (new Date(p.hired).getTime() - new Date(p.applied).getTime()) / 864e5)));
}

// ---------- Messaging ----------
export type MsgLite = { conversation_id: string; sender_id: string; created_at: string };

export function messagingStats(msgs: MsgLite[], me: string) {
  const sent = msgs.filter((m) => m.sender_id === me).length;
  const received = msgs.length - sent;
  const byConv = new Map<string, MsgLite[]>();
  for (const m of msgs) byConv.set(m.conversation_id, [...(byConv.get(m.conversation_id) ?? []), m]);
  let convsWithIncoming = 0, convsReplied = 0;
  const gaps: number[] = [];
  for (const list of byConv.values()) {
    list.sort((a, b) => a.created_at.localeCompare(b.created_at));
    const firstIn = list.findIndex((m) => m.sender_id !== me);
    if (firstIn < 0) continue;
    convsWithIncoming++;
    if (list.slice(firstIn).some((m) => m.sender_id === me)) convsReplied++;
    let waiting: string | null = null;
    for (const m of list) {
      if (m.sender_id !== me) { waiting ??= m.created_at; }
      else if (waiting) { gaps.push((new Date(m.created_at).getTime() - new Date(waiting).getTime()) / 36e5); waiting = null; }
    }
  }
  return {
    sent, received, conversations: byConv.size,
    responseRate: pct(convsReplied, convsWithIncoming),
    avgResponseHours: gaps.length ? Math.round((gaps.reduce((a, b) => a + b, 0) / gaps.length) * 10) / 10 : null,
  };
}

export function notificationStats(rows: { status: string; read_at: string | null }[]) {
  const opened = rows.filter((r) => r.status !== "unread" || r.read_at).length;
  return { sent: rows.length, opened, engagement: pct(opened, rows.length) };
}

// ---------- Export ----------
export function toCsv(rows: Record<string, string | number | null | undefined>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]!);
  const esc = (v: unknown) => {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@]/.test(s)) s = `'${s}`; // block spreadsheet formula injection
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}
