import { describe, expect, it } from "vitest";
import { filterNotifications, groupUnread, safeActionUrl, timeAgo, unreadCount, type Notification } from "./notifications";

const now = new Date("2026-10-04T12:00:00");
const n = (o: Partial<Notification>): Notification => ({
  notification_id: Math.random().toString(), notification_type: "new_application", category: "application", title: "T", message: "",
  action_url: "", priority: "medium", status: "unread", group_count: 1, created_at: now.toISOString(), read_at: null, ...o,
});
const base = { filter: "all", q: "", priority: "any", date: "any" } as const;

describe("timeAgo", () => {
  it("shows Just Now under a minute", () => expect(timeAgo(new Date(now.getTime() - 20e3).toISOString(), now)).toBe("Just Now"));
  it("shows minutes", () => expect(timeAgo(new Date(now.getTime() - 5 * 60e3).toISOString(), now)).toBe("5 Minutes Ago"));
  it("shows 1 Hour Ago", () => expect(timeAgo(new Date(now.getTime() - 3600e3).toISOString(), now)).toBe("1 Hour Ago"));
  it("shows Yesterday", () => expect(timeAgo("2026-10-03T09:00:00", now)).toBe("Yesterday"));
  it("shows a date when older", () => expect(timeAgo("2026-09-20T09:00:00", now)).toBe("Sep 20"));
});

describe("filterNotifications", () => {
  const list = [
    n({ status: "unread", priority: "high", category: "messaging", title: "Hi from Rita" }),
    n({ status: "read" }),
    n({ status: "archived" }),
    n({ status: "read", created_at: "2026-09-01T00:00:00" }),
  ];
  it("All hides archived", () => expect(filterNotifications(list, base, now)).toHaveLength(3));
  it("Archived shows only archived", () => expect(filterNotifications(list, { ...base, filter: "archived" }, now)).toHaveLength(1));
  it("Unread", () => expect(filterNotifications(list, { ...base, filter: "unread" }, now)).toHaveLength(1));
  it("High priority", () => expect(filterNotifications(list, { ...base, filter: "high" }, now)).toHaveLength(1));
  it("Messages category", () => expect(filterNotifications(list, { ...base, filter: "messaging" }, now)).toHaveLength(1));
  it("keyword", () => expect(filterNotifications(list, { ...base, q: "rita" }, now)).toHaveLength(1));
  it("last 7 days drops old", () => expect(filterNotifications(list, { ...base, date: "week" }, now)).toHaveLength(2));
});

describe("grouping and counts", () => {
  it("groups 5 high match jobs", () => {
    const list = Array.from({ length: 5 }, () => n({ notification_type: "high_match_job", category: "recommendation" }));
    expect(groupUnread(list)[0]?.label).toBe("5 New High Match Jobs");
  });
  it("sums grouped message counts into New Messages", () => {
    const list = [n({ notification_type: "new_message", category: "messaging", group_count: 3 }), n({ notification_type: "candidate_replied", category: "messaging" })];
    expect(groupUnread(list)[0]?.label).toBe("4 New Messages");
  });
  it("does not group singletons", () => expect(groupUnread([n({})])).toHaveLength(0));
  it("counts unread only", () => expect(unreadCount([n({}), n({ status: "read" })])).toBe(1));
});

describe("safeActionUrl", () => {
  it("allows in-app links", () => expect(safeActionUrl("/candidate/jobs/abc-1")).toBe("/candidate/jobs/abc-1"));
  it("blocks external links", () => expect(safeActionUrl("https://evil.com")).toBeNull());
});
