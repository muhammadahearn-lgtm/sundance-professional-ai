import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  LayoutDashboard, Briefcase, FileText, MessageSquare, UserRound, Settings, Search, GitBranch, LogOut, Menu, X, Building2, Bookmark,
  Compass, Lightbulb } from "lucide-react";
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
    { to: "/candidate/messages", label: "Messages", Icon: MessageSquare },
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
    { to: "/recruiter/messages", label: "Messages", Icon: MessageSquare },
    { to: "/recruiter/company", label: "Company", Icon: Building2 },
    { to: "/recruiter/profile", label: "Profile", Icon: UserRound },
    { to: "/recruiter/settings", label: "Settings", Icon: Settings },
  ],
} as const;

export function AppShell({ account }: { account: Account }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const onboarding = pathname.endsWith("/onboarding");
  const name = `${account.firstName} ${account.lastName}`.trim() || account.email;
  const initials = (account.firstName[0] ?? account.email[0] ?? "?").toUpperCase() + (account.lastName[0] ?? "").toUpperCase();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV[account.role].map(({ to, label, Icon }) => (
        <Link key={to} to={to} onClick={() => setOpen(false)}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          activeProps={{ className: "bg-primary-soft text-primary hover:bg-primary-soft hover:text-primary" }}>
          <Icon className="h-4 w-4" /> {label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            {!onboarding && (
              <button className="rounded-lg p-2 lg:hidden" aria-label="Toggle menu" onClick={() => setOpen(!open)}>
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}
            <Logo />
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold capitalize text-primary sm:inline">{account.role}</span>
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold leading-tight">{name}</div>
              <div className="text-xs text-muted-foreground">{account.email}</div>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">{initials}</span>
            <button onClick={signOut} className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Log out">
              <LogOut className="h-4 w-4" /><span className="hidden md:inline">Log out</span>
            </button>
          </div>
        </div>
        {open && !onboarding && <div className="border-t border-border bg-background p-4 lg:hidden">{nav}</div>}
      </header>
      <div className="flex">
        {!onboarding && <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 border-r border-border bg-background p-4 lg:block">{nav}</aside>}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8"><Outlet /></main>
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
