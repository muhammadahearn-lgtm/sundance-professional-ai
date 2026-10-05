import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Briefcase, FileText, MessageSquare, UserRound, Settings, Search, GitBranch, LogOut, Menu, X, Building2, Bookmark,
  Compass, Lightbulb, Bell, BarChart3, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell, NotificationNavBadge, NotificationsLive } from "@/components/notifications/Notifications";
import { useUnreadCount } from "@/components/messages/Messages";
import { Logo } from "@/components/site/Logo";
import { supabase } from "@/integrations/supabase/client";
import type { Account } from "@/lib/account";

const NAV = {
  candidate: [
    { to: "/candidate/dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { to: "/candidate/jobs", label: "Jobs", Icon: Briefcase },
    { to: "/candidate/jobs/saved", label: "Saved Jobs", Icon: Bookmark },
    { to: "/candidate/applications", label: "Applications", Icon: FileText },
    { to: "/candidate/career", label: "Career", Icon: Compass },
    { to: "/candidate/recommendations", label: "For You", Icon: Lightbulb },
    { to: "/candidate/analytics", label: "Analytics", Icon: BarChart3 },
    { to: "/candidate/messages", label: "Messages", Icon: MessageSquare },
    { to: "/candidate/notifications", label: "Notifications", Icon: Bell },
    { to: "/candidate/profile", label: "Profile", Icon: UserRound },
    { to: "/candidate/settings", label: "Settings", Icon: Settings },
  ],
  recruiter: [
    { to: "/recruiter/dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { to: "/recruiter/jobs", label: "Jobs", Icon: Briefcase },
    { to: "/recruiter/candidates", label: "Search Talent", Icon: Search },
    { to: "/recruiter/applications", label: "Applications", Icon: FileText },
    { to: "/recruiter/pipeline", label: "Pipeline", Icon: GitBranch },
    { to: "/recruiter/recommendations", label: "Recommendations", Icon: Lightbulb },
    { to: "/recruiter/analytics", label: "Analytics", Icon: BarChart3 },
    { to: "/recruiter/messages", label: "Messages", Icon: MessageSquare },
    { to: "/recruiter/notifications", label: "Notifications", Icon: Bell },
    { to: "/recruiter/company", label: "Company", Icon: Building2 },
    { to: "/recruiter/profile", label: "Profile", Icon: UserRound },
    { to: "/recruiter/settings", label: "Settings", Icon: Settings },
  ],
} as const;

function UnreadBadge() {
  const n = useUnreadCount();
  return n ? <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">{n}</span> : null;
}

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
  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;
    function onMove(ev: PointerEvent) {
      const w = Math.min(360, Math.max(200, startW + ev.clientX - startX));
      setWidth(w);
      localStorage.setItem("sundance.sidebarWidth", String(w));
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
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

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {NAV[account.role].map(({ to, label, Icon }) => (
        <Link key={to} to={to} onClick={() => setOpen(false)}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          activeProps={{ className: "bg-primary-soft text-primary hover:bg-primary-soft hover:text-primary", "aria-current": "page" }}>
          <Icon className="h-4 w-4 shrink-0" aria-hidden /> <span className="min-w-0 truncate">{label}</span>{to.endsWith("/messages") && <UnreadBadge />}{to.endsWith("/notifications") && <NotificationNavBadge uid={account.userId} />}
        </Link>
      ))}
    </nav>
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
              <button type="button" className="hidden rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:inline-flex"
                aria-label={collapsed ? "Show sidebar" : "Hide sidebar"} title={collapsed ? "Show sidebar" : "Hide sidebar"}
                aria-expanded={!collapsed} onClick={toggleCollapsed}>
                {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
              </button>
            )}
            <div className="min-w-0"><Logo /></div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
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
          <aside aria-label="Sidebar" className="sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 overflow-y-auto border-r border-border bg-background p-4 lg:relative lg:block" style={{ width }}>
            {nav}
            <div
              role="separator" aria-orientation="vertical" aria-label="Resize sidebar" aria-valuemin={200} aria-valuemax={360} aria-valuenow={width}
              tabIndex={0}
              title="Drag to resize, double-click to hide"
              onPointerDown={startResize}
              onDoubleClick={toggleCollapsed}
              onKeyDown={(e) => {
                if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
                e.preventDefault();
                const w = Math.min(360, Math.max(200, width + (e.key === "ArrowRight" ? 16 : -16)));
                setWidth(w); localStorage.setItem("sundance.sidebarWidth", String(w));
              }}
              className="absolute inset-y-0 right-0 w-1.5 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 focus-visible:bg-primary/50"
            />
          </aside>
        )}
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 p-4 outline-none sm:p-6 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string | undefined }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
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
