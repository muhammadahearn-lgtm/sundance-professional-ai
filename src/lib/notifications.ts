// Pure notification helpers: filtering, grouping, time display. No I/O.

export type NotificationCategory = "application" | "messaging" | "pipeline" | "recommendation" | "career" | "match" | "company";
export type NotificationPriority = "high" | "medium" | "low";
export type NotificationStatus = "unread" | "read" | "archived";

export type Notification = {
  notification_id: string;
  notification_type: string;
  category: NotificationCategory | string;
  title: string;
  message: string;
  action_url: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  group_count: number;
  created_at: string;
  read_at: string | null;
};

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  application: "Applications",
  messaging: "Messages",
  pipeline: "Pipeline",
  recommendation: "Recommendations",
  career: "Career Intelligence",
  match: "Match Intelligence",
  company: "Company Team",
};
export const CATEGORIES = Object.keys(CATEGORY_LABELS) as NotificationCategory[];

export const FILTERS = ["all", "unread", "read", "archived", "high", "messaging", "application", "recommendation", "career", "match"] as const;
export type NotificationFilter = (typeof FILTERS)[number];
export const FILTER_LABELS: Record<NotificationFilter, string> = {
  all: "All", unread: "Unread", read: "Read", archived: "Archived", high: "High Priority",
  messaging: "Messages", application: "Applications", recommendation: "Recommendations", career: "Career Intelligence", match: "Match Intelligence",
};

export const DATE_RANGES = { any: "Any time", today: "Today", week: "Last 7 days", month: "Last 30 days" } as const;
export type DateRange = keyof typeof DATE_RANGES;

export type NotificationQuery = { filter: NotificationFilter; q: string; priority: NotificationPriority | "any"; date: DateRange };

/** "Just Now", "5 Minutes Ago", "1 Hour Ago", "Yesterday", or a date. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const t = new Date(iso);
  const s = Math.max(0, (now.getTime() - t.getTime()) / 1000);
  if (s < 60) return "Just Now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} Minute${m === 1 ? "" : "s"} Ago`;
  const h = Math.floor(m / 60);
  if (h < 24 && t.toDateString() === now.toDateString()) return `${h} Hour${h === 1 ? "" : "s"} Ago`;
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (t.toDateString() === y.toDateString()) return "Yesterday";
  if (h < 24) return `${h} Hour${h === 1 ? "" : "s"} Ago`;
  return t.toLocaleDateString("en-US", { month: "short", day: "numeric", year: t.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

export function filterNotifications(list: Notification[], f: NotificationQuery, now: Date = new Date()): Notification[] {
  const q = f.q.trim().toLowerCase();
  const minTime = f.date === "today" ? new Date(now.toDateString()).getTime()
    : f.date === "week" ? now.getTime() - 7 * 864e5
    : f.date === "month" ? now.getTime() - 30 * 864e5 : 0;
  return list.filter((n) => {
    if (f.filter === "archived" ? n.status !== "archived" : n.status === "archived") return false;
    if (f.filter === "unread" && n.status !== "unread") return false;
    if (f.filter === "read" && n.status !== "read") return false;
    if (f.filter === "high" && n.priority !== "high") return false;
    if (CATEGORIES.includes(f.filter as NotificationCategory) && n.category !== f.filter) return false;
    if (f.priority !== "any" && n.priority !== f.priority) return false;
    if (minTime && new Date(n.created_at).getTime() < minTime) return false;
    if (q && !`${n.title} ${n.message}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

export function unreadCount(list: Notification[]): number {
  return list.filter((n) => n.status === "unread").length;
}

const GROUP_LABELS: Record<string, [string, string]> = {
  high_match_job: ["New High Match Job", "New High Match Jobs"],
  high_match_candidate: ["New High Match Candidate", "New High Match Candidates"],
  match_score_increased: ["Match Score Increase", "Match Score Increases"],
  new_application: ["New Application", "New Applications"],
  pipeline_stage_change: ["Pipeline Update", "Pipeline Updates"],
  availability_changed: ["Availability Change", "Availability Changes"],
  saved_job_updated: ["Saved Job Update", "Saved Job Updates"],
};
const MESSAGE_TYPES = ["new_message", "new_conversation", "attachment_received", "candidate_replied"];

/** Smart grouping of unread notifications: "5 New High Match Jobs", "4 New Messages". Only groups with 2+ items. */
export function groupUnread(list: Notification[]): { key: string; label: string; count: number; category: string }[] {
  const counts = new Map<string, { count: number; category: string }>();
  for (const n of list) {
    if (n.status !== "unread") continue;
    const key = MESSAGE_TYPES.includes(n.notification_type) ? "messages" : n.notification_type;
    const add = key === "messages" ? Math.max(1, n.group_count) : 1;
    const cur = counts.get(key) ?? { count: 0, category: n.category };
    counts.set(key, { count: cur.count + add, category: cur.category });
  }
  return [...counts.entries()]
    .filter(([, v]) => v.count >= 2)
    .map(([key, v]) => ({
      key, count: v.count, category: v.category,
      label: `${v.count} ${key === "messages" ? "New Messages" : (GROUP_LABELS[key]?.[1] ?? "New Notifications")}`,
    }))
    .sort((a, b) => b.count - a.count);
}

/** Only allow in-app relative links. */
export function safeActionUrl(url: string): string | null {
  return /^\/(candidate|recruiter)\/[\w\-/]*(\?candidate=[0-9a-f-]{36})?$/i.test(url) ? url : null;
}
