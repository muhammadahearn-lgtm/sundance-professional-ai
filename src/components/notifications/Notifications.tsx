import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArrowLeft, Bell, Briefcase, CheckCheck, Compass, GitBranch, Lightbulb, MessageSquare, Search, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  CATEGORIES, CATEGORY_LABELS, DATE_RANGES, FILTERS, FILTER_LABELS, filterNotifications, groupUnread, safeActionUrl, timeAgo, unreadCount,
  type DateRange, type Notification, type NotificationCategory, type NotificationFilter, type NotificationPriority,
} from "@/lib/notifications";

type Role = "candidate" | "recruiter";
const card = "rounded-2xl border border-border bg-card shadow-soft";
const btn = "inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50";
const key = (uid: string) => ["notifications", uid] as const;

const ICONS: Record<string, typeof Bell> = {
  application: Briefcase, messaging: MessageSquare, pipeline: GitBranch, recommendation: Lightbulb, career: Compass, match: Sparkles,
};
const PRIORITY_CLS: Record<NotificationPriority, string> = {
  high: "bg-destructive/10 text-destructive", medium: "bg-warning/15 text-foreground", low: "bg-muted text-muted-foreground",
};

async function fetchNotifications(uid: string): Promise<Notification[]> {
  const { data, error } = await supabase.from("notifications")
    .select("notification_id, notification_type, category, title, message, action_url, priority, status, group_count, created_at, read_at")
    .eq("recipient_id", uid).order("created_at", { ascending: false }).limit(300);
  if (error) throw error;
  return (data ?? []) as Notification[];
}

export function useNotifications(uid: string) {
  return useQuery({ queryKey: key(uid), queryFn: () => fetchNotifications(uid), staleTime: 30_000 });
}

/** Mount once (in the app shell): keeps the list live and toasts new arrivals. */
export function NotificationsLive({ uid }: { uid: string }) {
  const qc = useQueryClient();
  const [lost, setLost] = useState(false);
  useEffect(() => {
    const ch = supabase.channel(`notifications-${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${uid}` }, (p) => {
        void qc.invalidateQueries({ queryKey: key(uid) });
        if (p.eventType === "INSERT") toast((p.new as Notification).title, { description: "Notification received" });
      })
      .subscribe((s) => setLost(s === "CHANNEL_ERROR" || s === "TIMED_OUT"));
    return () => { void supabase.removeChannel(ch); };
  }, [uid, qc]);
  return lost ? <div role="status" className="bg-destructive/10 px-4 py-1.5 text-center text-xs font-medium text-destructive">Connection Lost — notifications will refresh when you reconnect.</div> : null;
}

function useActions(uid: string) {
  const qc = useQueryClient();
  const patch = (fn: (n: Notification) => Notification | null) =>
    qc.setQueryData<Notification[]>(key(uid), (old) => (old ?? []).map((n) => fn(n)).filter(Boolean) as Notification[]);
  const refresh = () => qc.invalidateQueries({ queryKey: key(uid) });
  async function run(p: PromiseLike<{ error: unknown }>, ok: string | null) {
    const { error } = await p;
    if (error) { toast.error("Something went wrong. Please try again."); void refresh(); return false; }
    if (ok) toast.success(ok);
    return true;
  }
  const now = () => new Date().toISOString();
  return {
    markRead: (id: string, quiet = false) => {
      patch((n) => (n.notification_id === id && n.status === "unread" ? { ...n, status: "read", read_at: now() } : n));
      return run(supabase.from("notifications").update({ status: "read", read_at: now() }).eq("notification_id", id).eq("status", "unread"), quiet ? null : "Marked As Read");
    },
    markAllRead: () => {
      patch((n) => (n.status === "unread" ? { ...n, status: "read", read_at: now() } : n));
      return run(supabase.from("notifications").update({ status: "read", read_at: now() }).eq("recipient_id", uid).eq("status", "unread"), "All notifications marked as read");
    },
    archive: (id: string) => {
      patch((n) => (n.notification_id === id ? { ...n, status: "archived", read_at: n.read_at ?? now() } : n));
      return run(supabase.from("notifications").update({ status: "archived", read_at: now() }).eq("notification_id", id), "Archived Successfully");
    },
    restore: (id: string) => {
      patch((n) => (n.notification_id === id ? { ...n, status: "read" } : n));
      return run(supabase.from("notifications").update({ status: "read" }).eq("notification_id", id), "Restored");
    },
    archiveAllRead: () => {
      patch((n) => (n.status === "read" ? { ...n, status: "archived" } : n));
      return run(supabase.from("notifications").update({ status: "archived" }).eq("recipient_id", uid).eq("status", "read"), "Read notifications archived");
    },
  };
}

function useOpen(uid: string) {
  const router = useRouter();
  const { markRead } = useActions(uid);
  return (n: Notification) => {
    if (n.status === "unread") void markRead(n.notification_id, true);
    const url = safeActionUrl(n.action_url);
    if (url) void router.navigate({ href: url });
  };
}

function Item({ n, uid, compact, role }: { n: Notification; uid: string; compact?: boolean | undefined; role: Role }) {
  const open = useOpen(uid);
  const a = useActions(uid);
  const Icon = ICONS[n.category] ?? Bell;
  const unread = n.status === "unread";
  return (
    <div className={`group flex gap-3 rounded-xl p-3 transition-colors hover:bg-muted/60 ${unread ? "bg-primary-soft/50" : ""}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"><Icon className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <button onClick={() => open(n)} className="block w-full text-left">
          <div className="flex items-start gap-2">
            <p className={`text-sm leading-snug ${unread ? "font-bold" : "font-medium"}`}>{n.title}</p>
            {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
          </div>
          {n.message && <p className={`mt-0.5 text-xs text-muted-foreground ${compact ? "line-clamp-1" : "line-clamp-2"}`}>{n.message}</p>}
        </button>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span>{timeAgo(n.created_at)}</span>
          <span>· {CATEGORY_LABELS[n.category as NotificationCategory] ?? n.category}</span>
          {!compact && <span className={`rounded-full px-2 py-0.5 font-semibold capitalize ${PRIORITY_CLS[n.priority]}`}>{n.priority}</span>}
          <span className="ml-auto flex gap-1">
            {safeActionUrl(n.action_url) && <button onClick={() => open(n)} className="rounded-md px-2 py-0.5 font-semibold text-primary hover:bg-primary-soft">{n.category === "messaging" ? "Open Conversation" : "Open"}</button>}
            {unread && <button onClick={() => void a.markRead(n.notification_id)} className="rounded-md px-2 py-0.5 font-semibold hover:bg-muted">Mark As Read</button>}
            {!compact && (n.status === "archived"
              ? <button onClick={() => void a.restore(n.notification_id)} className="rounded-md px-2 py-0.5 font-semibold hover:bg-muted">Restore</button>
              : <button onClick={() => void a.archive(n.notification_id)} className="rounded-md px-2 py-0.5 font-semibold hover:bg-muted" aria-label="Archive"><Archive className="h-3.5 w-3.5" /></button>)}
            {!compact && <Link to={role === "candidate" ? "/candidate/notifications/$id" : "/recruiter/notifications/$id"} params={{ id: n.notification_id }} className="rounded-md px-2 py-0.5 font-semibold hover:bg-muted">Details</Link>}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Header bell with unread count and a dropdown (drawer on phones) of the latest 10. */
export function NotificationBell({ uid, role }: { uid: string; role: Role }) {
  const q = useNotifications(uid);
  const a = useActions(uid);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const list = (q.data ?? []).filter((n) => n.status !== "archived");
  const unread = unreadCount(list);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  const center = role === "candidate" ? "/candidate/notifications" : "/recruiter/notifications";
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Notifications, ${unread} unread`} aria-expanded={open}>
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && (
        <div className="fixed inset-x-0 top-16 z-50 max-h-[calc(100vh-4rem)] overflow-hidden border-b border-border bg-card shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[400px] sm:rounded-2xl sm:border">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div><p className="font-bold">Notifications</p><p className="text-xs text-muted-foreground">{unread} Unread · {list.length} Total</p></div>
            <div className="flex items-center gap-1">
              {unread > 0 && <button onClick={() => void a.markAllRead()} className={btn}><CheckCheck className="h-3.5 w-3.5" />Mark all read</button>}
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-muted sm:hidden" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {q.isError ? <p className="p-6 text-center text-sm text-destructive">Unable To Load Notifications</p>
              : q.isLoading ? <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>
              : list.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">You're all caught up.</p>
              : list.slice(0, 10).map((n) => <div key={n.notification_id} onClick={(e) => { if ((e.target as HTMLElement).closest("button,a")) setTimeout(() => setOpen(false), 0); }}><Item n={n} uid={uid} compact role={role} /></div>)}
          </div>
          <Link to={center} onClick={() => setOpen(false)} className="block border-t border-border px-4 py-3 text-center text-sm font-semibold text-primary hover:bg-muted">View all notifications</Link>
        </div>
      )}
    </div>
  );
}

export function NotificationNavBadge({ uid }: { uid: string }) {
  const n = unreadCount(useNotifications(uid).data ?? []);
  return n ? <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">{n}</span> : null;
}

/** Full notification center with filters, search, smart groups and bulk actions. */
export function NotificationCenter({ uid, role }: { uid: string; role: Role }) {
  const q = useNotifications(uid);
  const a = useActions(uid);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [kw, setKw] = useState("");
  const [priority, setPriority] = useState<NotificationPriority | "any">("any");
  const [date, setDate] = useState<DateRange>("any");
  const all = q.data ?? [];
  const list = useMemo(() => filterNotifications(all, { filter, q: kw, priority, date }), [all, filter, kw, priority, date]);
  const groups = useMemo(() => groupUnread(all), [all]);
  const unread = unreadCount(all);
  const sel = "h-9 rounded-lg border border-border bg-background px-2 text-sm";
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">{unread} unread · {all.filter((n) => n.status !== "archived").length} total</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={btn} disabled={!unread} onClick={() => void a.markAllRead()}><CheckCheck className="h-3.5 w-3.5" />Mark All Read</button>
          <button className={btn} disabled={!all.some((n) => n.status === "read")} onClick={() => void a.archiveAllRead()}><Archive className="h-3.5 w-3.5" />Archive All Read</button>
          <button className={btn} onClick={() => toast("Clearing old notifications is coming soon.")}><Trash2 className="h-3.5 w-3.5" />Clear Old</button>
          <Link to={role === "candidate" ? "/candidate/settings" : "/recruiter/settings"} hash="notification-preferences" className={btn}>Preferences</Link>
        </div>
      </div>

      {groups.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {groups.map((g) => (
            <button key={g.key} onClick={() => setFilter(g.key === "messages" ? "messaging" : (CATEGORIES.includes(g.category as NotificationCategory) ? g.category as NotificationFilter : "unread"))}
              className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/15">{g.label}</button>
          ))}
        </div>
      )}

      <div className={`${card} mb-4 space-y-3 p-4`}>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{FILTER_LABELS[f]}</button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input value={kw} onChange={(e) => setKw(e.target.value.slice(0, 100))} placeholder="Search notifications" aria-label="Search notifications" className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-sm" />
          </label>
          <select className={sel} value={priority} onChange={(e) => setPriority(e.target.value as NotificationPriority | "any")} aria-label="Priority">
            <option value="any">Any priority</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select>
          <select className={sel} value={date} onChange={(e) => setDate(e.target.value as DateRange)} aria-label="Date">
            {(Object.keys(DATE_RANGES) as DateRange[]).map((d) => <option key={d} value={d}>{DATE_RANGES[d]}</option>)}
          </select>
        </div>
      </div>

      <div className={`${card} p-2`}>
        {q.isError ? (
          <div className="p-10 text-center"><p className="font-semibold text-destructive">Unable To Load Notifications</p><button className={`${btn} mt-3`} onClick={() => void q.refetch()}>Try again</button></div>
        ) : q.isLoading ? <p className="p-10 text-center text-sm text-muted-foreground">Loading notifications…</p>
          : list.length === 0 ? (
            <div className="p-10 text-center"><Bell className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-2 font-semibold">No notifications here</p>
              <p className="text-sm text-muted-foreground">{all.length ? "Try a different filter." : "Applications, messages and matches will show up here."}</p></div>
          ) : <div className="divide-y divide-border/60">{list.map((n) => <Item key={n.notification_id} n={n} uid={uid} role={role} />)}</div>}
      </div>
    </div>
  );
}

export function NotificationDetail({ uid, role, id }: { uid: string; role: Role; id: string }) {
  const q = useNotifications(uid);
  const a = useActions(uid);
  const open = useOpen(uid);
  const n = q.data?.find((x) => x.notification_id === id);
  useEffect(() => { if (n?.status === "unread") void a.markRead(n.notification_id, true); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n?.notification_id]);
  const back = role === "candidate" ? "/candidate/notifications" : "/recruiter/notifications";
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (q.isError) return <div className={`${card} mx-auto max-w-2xl p-10 text-center`} role="alert"><p className="font-semibold text-destructive">Unable To Load Notifications</p><button className={`${btn} mt-3`} onClick={() => void q.refetch()}>Try again</button></div>;
  if (!n) return (
    <div className={`${card} mx-auto max-w-2xl p-10 text-center`}><p className="font-semibold">Notification Not Found</p>
      <p className="text-sm text-muted-foreground">It may have been removed, or it belongs to another account.</p>
      <Link to={back} className={`${btn} mt-4`}>Back to notifications</Link></div>
  );
  const Icon = ICONS[n.category] ?? Bell;
  return (
    <div className="mx-auto max-w-2xl">
      <Link to={back} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />All notifications</Link>
      <div className={`${card} p-6`}>
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"><Icon className="h-5 w-5" /></span>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold">{n.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground">{timeAgo(n.created_at)} · {CATEGORY_LABELS[n.category as NotificationCategory] ?? n.category} · <span className="capitalize">{n.priority} priority</span></p>
          </div>
        </div>
        {n.message && <p className="mt-5 whitespace-pre-line text-sm">{n.message}</p>}
        <div className="mt-6 flex flex-wrap gap-2">
          {safeActionUrl(n.action_url) && <button onClick={() => open(n)} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">{n.category === "messaging" ? "Open Conversation" : "Open Related Item"}</button>}
          {n.status === "archived" ? <button className={btn} onClick={() => void a.restore(n.notification_id)}>Restore</button>
            : <button className={btn} onClick={() => void a.archive(n.notification_id)}><Archive className="h-3.5 w-3.5" />Archive</button>}
        </div>
      </div>
    </div>
  );
}

/** Dashboard widget: unread count, grouped highlights, recent items. */
export function NotificationWidget({ uid, role }: { uid: string; role: Role }) {
  const q = useNotifications(uid);
  const all = (q.data ?? []).filter((n) => n.status !== "archived");
  const unread = unreadCount(all);
  const count = (c: string) => all.filter((n) => n.status === "unread" && n.category === c).length;
  const stats: [string, number][] = role === "recruiter"
    ? [["New Applications", count("application")], ["New Messages", count("messaging")], ["Pipeline Updates", count("pipeline")], ["Candidate Alerts", count("recommendation")]]
    : [["Applications", count("application")], ["Messages", count("messaging")], ["Matches", count("recommendation") + count("match")], ["Career", count("career")]];
  return (
    <section className={`${card} p-5`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-bold">Notifications</h2>
        <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">{unread} unread</span>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {stats.map(([l, v]) => <div key={l} className="rounded-xl bg-muted/50 px-3 py-2"><div className="text-lg font-extrabold">{v}</div><div className="text-[11px] text-muted-foreground">{l}</div></div>)}
      </div>
      {q.isError ? <p className="text-sm text-destructive">Unable To Load Notifications</p>
        : all.length === 0 ? <p className="text-sm text-muted-foreground">No notifications yet.</p>
        : <div className="-mx-2">{all.slice(0, 3).map((n) => <Item key={n.notification_id} n={n} uid={uid} compact role={role} />)}</div>}
      <Link to={role === "candidate" ? "/candidate/notifications" : "/recruiter/notifications"} className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">View all</Link>
    </section>
  );
}

type Prefs = Record<Exclude<NotificationCategory, "company">, boolean>;
const PREF_LABELS: [keyof Prefs, string, string][] = [
  ["application", "Application Notifications", "Submissions, status changes and saved job updates."],
  ["messaging", "Messaging Notifications", "New messages, replies and attachments."],
  ["pipeline", "Pipeline Notifications", "Stage changes and candidate availability."],
  ["recommendation", "Recommendation Notifications", "New high match jobs and candidates."],
  ["career", "Career Notifications", "Readiness improvements and milestones."],
  ["match", "Match Notifications", "Match score increases."],
];

export function NotificationPreferences({ uid, role }: { uid: string; role: Role }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["notification-prefs", uid],
    queryFn: async () => {
      const { data, error } = await supabase.from("notification_preferences").select("application, messaging, pipeline, recommendation, career, match").eq("user_id", uid).maybeSingle();
      if (error) throw error;
      return (data ?? { application: true, messaging: true, pipeline: true, recommendation: true, career: true, match: true }) as Prefs;
    },
  });
  async function set(k: keyof Prefs, v: boolean) {
    const next = { ...(q.data as Prefs), [k]: v };
    qc.setQueryData(["notification-prefs", uid], next);
    const { error } = await supabase.from("notification_preferences").upsert({ user_id: uid, ...next, updated_at: new Date().toISOString() });
    if (error) { toast.error("Couldn't save preferences."); void q.refetch(); } else toast.success("Preferences Updated");
  }
  const rows = PREF_LABELS.filter(([k]) => role === "recruiter" ? k !== "career" && k !== "match" : k !== "pipeline");
  if (q.isError) return <p className="text-sm text-destructive">Unable to load preferences.</p>;
  return (
    <div className="space-y-1">
      {rows.map(([k, l, d]) => (
        <label key={k} className="flex cursor-pointer items-center justify-between gap-4 rounded-xl p-3 hover:bg-muted/50">
          <span><span className="block text-sm font-semibold">{l}</span><span className="block text-xs text-muted-foreground">{d}</span></span>
          <input type="checkbox" role="switch" className="h-5 w-9 cursor-pointer accent-primary" disabled={!q.data} checked={q.data?.[k] ?? true} onChange={(e) => void set(k, e.target.checked)} aria-label={l} />
        </label>
      ))}
    </div>
  );
}
