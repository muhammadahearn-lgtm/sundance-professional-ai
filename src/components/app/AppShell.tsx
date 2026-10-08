import { PanelShowButton, PanelToggleButton } from "@/components/ui/panel-toggle";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Briefcase, FileText, MessageSquare, UserRound, Settings, Search, GitBranch, LogOut, Menu, X, Building2, Bookmark,
  Compass, Lightbulb, Bell, BarChart3, GitCompare, CalendarDays } from "lucide-react";
import { useUpcomingInterviewCount } from "@/components/applications/InterviewsHub";
import { listCompareIds } from "@/lib/job-search-data";
import { listComparedCandidates } from "@/lib/talent-data";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell, NotificationNavBadge, NotificationsLive } from "@/components/notifications/Notifications";
import { useUnreadCount } from "@/components/messages/Messages";
import { Logo } from "@/components/site/Logo";
import { ThemeToggle } from "./ThemeControls";
import { supabase } from "@/integrations/supabase/client";
import type { Account } from "@/lib/account";

type NavItem = { to: string; label: string; Icon: typeof LayoutDashboard; match?: string[]; badge?: "compare" | "interviews" | "messages" };
/** Primary workspace links. `match` lists sibling pages that belong to the same workspace (shown as tabs). */
const NAV: Record<"candidate" | "recruiter", NavItem[]> = {
  candidate: [
    { to: "/candidate/dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { to: "/candidate/jobs", label: "Jobs", Icon: Briefcase, match: ["/candidate/jobs/saved", "/candidate/jobs/compare", "/candidate/saved-jobs"], badge: "compare" },
    { to: "/candidate/applications", label: "Applications", Icon: FileText, match: ["/candidate/interviews"], badge: "interviews" },
    { to: "/candidate/recommendations", label: "For You", Icon: Lightbulb, match: ["/candidate/career"] },
    { to: "/candidate/analytics", label: "Analytics", Icon: BarChart3 },
    { to: "/candidate/messages", label: "Messages", Icon: MessageSquare, badge: "messages" },
  ],
  recruiter: [
    { to: "/recruiter/dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { to: "/recruiter/jobs", label: "Jobs", Icon: Briefcase },
    { to: "/recruiter/candidates", label: "Talent", Icon: Search, badge: "compare" },
    { to: "/recruiter/pipeline", label: "Pipeline", Icon: GitBranch, match: ["/recruiter/applications", "/recruiter/interviews"], badge: "interviews" },
    { to: "/recruiter/recommendations", label: "Recommendations", Icon: Lightbulb },
    { to: "/recruiter/analytics", label: "Analytics", Icon: BarChart3 },
    { to: "/recruiter/messages", label: "Messages", Icon: MessageSquare, badge: "messages" },
  ],
};
/** Account links shown in the sidebar footer card. */
const ACCOUNT_NAV: Record<"candidate" | "recruiter", NavItem[]> = {
  candidate: [
    { to: "/candidate/profile", label: "My Profile", Icon: UserRound },
    { to: "/candidate/settings", label: "Settings", Icon: Settings },
  ],
  recruiter: [
    { to: "/recruiter/company", label: "Company", Icon: Building2 },
    { to: "/recruiter/profile", label: "Profile", Icon: UserRound },
    { to: "/recruiter/settings", label: "Settings", Icon: Settings },
  ],
};
type Tab = { to: string; label: string; badge?: "compare" | "interviews" };
/** Tabbed workspaces: list pages sharing one sidebar entry. Detail pages (e.g. /jobs/$id) show no tabs. */
const WORKSPACES: Tab[][] = [
  [{ to: "/recruiter/candidates", label: "Search Talent" }, { to: "/recruiter/candidates/saved", label: "Saved" }, { to: "/recruiter/candidates/compare", label: "Compare", badge: "compare" }],
  [{ to: "/recruiter/pipeline", label: "Board" }, { to: "/recruiter/applications", label: "Applications" }, { to: "/recruiter/interviews", label: "Interviews", badge: "interviews" }],
  [{ to: "/candidate/jobs", label: "Search Jobs" }, { to: "/candidate/jobs/saved", label: "Saved" }, { to: "/candidate/jobs/compare", label: "Compare", badge: "compare" }],
  [{ to: "/candidate/applications", label: "My Applications" }, { to: "/candidate/interviews", label: "Interviews", badge: "interviews" }],
  [{ to: "/candidate/recommendations", label: "Recommended" }, { to: "/candidate/career", label: "Career" }],
];
const norm = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);
export function workspaceFor(pathname: string) { const p = norm(pathname); return WORKSPACES.find((w) => w.some((t) => t.to === p)); }

function WorkspaceTabs({ account, pathname }: { account: Account; pathname: string }) {
  const tabs = workspaceFor(pathname);
  if (!tabs) return null;
  const p = norm(pathname);
  return (
    <div role="tablist" aria-label="Workspace sections" className="mb-6 inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-1 shadow-soft">
      {tabs.map((t) => {
        const on = t.to === p;
        return (
          <Link key={t.to} to={t.to} role="tab" aria-selected={on}
            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${on ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
            {t.label}{t.badge === "compare" && <CompareBadge uid={account.userId} role={account.role} inline />}{t.badge === "interviews" && <InterviewBadge uid={account.userId} role={account.role} inline />}
          </Link>
        );
      })}
    </div>
  );
}

const inlinePill = "grid h-5 min-w-5 place-items-center rounded-full bg-primary-soft px-1.5 text-[11px] font-bold text-primary";
const pill = "ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground";
function UnreadBadge() {
  const n = useUnreadCount();
  return n ? <span className={pill}>{n}</span> : null;
}
/** Live count of items queued for comparison (shares cache keys with the compare lists). */
function CompareBadge({ uid, role, inline }: { uid: string; role: "candidate" | "recruiter"; inline?: boolean }) {
  const q = useQuery({ queryKey: role === "candidate" ? ["compare-jobs", uid] : ["cmp-cands", uid], queryFn: () => (role === "candidate" ? listCompareIds(uid) : listComparedCandidates(uid)) });
  const n = q.data?.length ?? 0;
  return n ? <span className={inline ? inlinePill : pill} aria-label={`${n} selected`}>{n}</span> : null;
}
function InterviewBadge({ uid, role, inline }: { uid: string; role: "candidate" | "recruiter"; inline?: boolean }) {
  const n = useUpcomingInterviewCount(uid, role);
  return n ? <span className={inline ? inlinePill : pill} aria-label={`${n} upcoming`}>{n}</span> : null;
}

import { PanelReveal, PanelSeparator } from "@/components/ui/panel-separator";

export function AppShell({ account }: { account: Account }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(240);
  useEffect(() => {
    setCollapsed(localStorage.getItem("sundance.sidebarCollapsed") === "1");
    const w = Number(localStorage.getItem("sundance.sidebarWidth"));
    if (w >= 200 && w <= 360) setWidth(w);
  }, []);
  function toggleCollapsed() {
    setCollapsed((c) => { localStorage.setItem("sundance.sidebarCollapsed", c ? "0" : "1"); return !c; });
  }
  const onboarding = pathname.endsWith("/onboarding");
  // Close the phone menu when the page changes or Escape is pressed.
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const name = `${account.firstName} ${account.lastName}`.trim() || account.email;
  const initials = (account.firstName[0] ?? account.email[0] ?? "?").toUpperCase() + (account.lastName[0] ?? "").toUpperCase();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const hit = (p: string) => pathname === p || pathname.startsWith(`${p}/`);
  const navLink = ({ to, label, Icon, badge }: NavItem, active: boolean) => (
    <Link key={to} to={to} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden /> <span className="min-w-0 truncate">{label}</span>
      {badge === "messages" && <UnreadBadge />}{badge === "compare" && <CompareBadge uid={account.userId} role={account.role} />}{badge === "interviews" && <InterviewBadge uid={account.userId} role={account.role} />}
    </Link>
  );
  const nav = (
    <div className="flex min-h-full flex-col gap-4">
      <nav className="flex flex-col gap-1" aria-label="Main">
        {NAV[account.role].map((item) => navLink(item, hit(item.to) || !!item.match?.some(hit)))}
        {ACCOUNT_NAV[account.role].map((item) => navLink(item, hit(item.to)))}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-1 sm:gap-2">
            {!onboarding && (
              <button type="button" className="shrink-0 rounded-lg p-2.5 hover:bg-muted lg:hidden" aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(!open)}>
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}
            {!onboarding && (
              <PanelToggleButton open={!collapsed} label="sidebar" onClick={toggleCollapsed} size="md" className="hidden lg:inline-flex" />
            )}
            <div className="min-w-0"><Logo /></div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeToggle />
            {!onboarding && <NotificationBell uid={account.userId} role={account.role} />}
            <span className="hidden rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold capitalize text-primary sm:inline">{account.role}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Open account menu"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-testid="account-avatar"
                >
                  {initials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-sm font-semibold leading-tight">{name}</div>
                  <div className="text-xs font-normal capitalize text-muted-foreground">{account.role}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={`/${account.role}/profile`}><UserRound className="h-4 w-4" />Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`/${account.role}/settings`}><Settings className="h-4 w-4" />Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={signOut} className="text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" />Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {!onboarding && <NotificationsLive uid={account.userId} />}
        {open && !onboarding && <div id="mobile-nav" className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-border bg-background p-4 lg:hidden">{nav}</div>}
      </header>
      <div className="flex">
        {!onboarding && !collapsed && (
          <aside aria-label="Sidebar" className="sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 border-r border-border bg-background lg:block" style={{ width }}>
            <div className="flex h-full flex-col overflow-y-auto p-4">{nav}</div>
            <PanelSeparator label="sidebar" width={width} setWidth={(w) => { const c = Math.min(360, Math.max(200, w)); setWidth(c); localStorage.setItem("sundance.sidebarWidth", String(c)); }} min={200} max={360} onHide={toggleCollapsed} />
          </aside>
        )}
        {!onboarding && collapsed && (
          <div className="sticky top-16 hidden h-[calc(100vh-4rem)] lg:flex"><PanelReveal label="sidebar" onShow={toggleCollapsed} className="relative" /></div>
        )}
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 p-4 outline-none sm:p-6 lg:p-8">{!onboarding && <WorkspaceTabs account={account} pathname={pathname} />}<Outlet /></main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string | undefined }) {
  return (
    <div className="relative mb-6">
      <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-64 rounded-full bg-primary/10 blur-3xl" />
      <h1 className="relative text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
      <div className="relative mt-2 h-1 w-12 rounded-full bg-gradient-primary" />
      {subtitle && <p className="relative mt-2 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export function Placeholder({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <PageHeader title={title} />
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center shadow-soft">
        <p className="font-semibold">Coming soon</p>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </>
  );
}
