import { Bell, Briefcase, CalendarCheck, Eye, FileText, Sparkles, TrendingUp, UserCheck, Users } from "lucide-react";
import type { ReactNode } from "react";
import type { Account } from "@/lib/account";
import { PageHeader } from "./AppShell";

function Widget({ title, children, action }: { title: string; children: ReactNode; action?: string }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-bold">{title}</h2>
        {action && <span className="text-xs font-semibold text-primary">{action}</span>}
      </div>
      {children}
    </section>
  );
}

function Stat({ Icon, n, label }: { Icon: typeof Briefcase; n: string; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary"><Icon className="h-4 w-4" /></span>
      <div className="mt-3 text-2xl font-extrabold">{n}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function Bar({ label, v }: { label: string; v: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm"><span className="font-medium">{label}</span><span className="text-muted-foreground">{v}%</span></div>
      <div className="mt-1.5 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-gradient-primary" style={{ width: `${v}%` }} /></div>
    </div>
  );
}

function Badge({ n }: { n: number }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${n >= 90 ? "bg-success/15 text-success" : "bg-primary-soft text-primary"}`}>{n}%</span>;
}

function Row({ title, sub, right }: { title: string; sub: string; right: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
      <div className="min-w-0"><div className="truncate text-sm font-semibold">{title}</div><div className="truncate text-xs text-muted-foreground">{sub}</div></div>
      {right}
    </div>
  );
}

export function CandidateDashboard({ account }: { account: Account }) {
  return (
    <>
      <PageHeader title={`Welcome back, ${account.firstName || "there"}`} subtitle="Here's where your job search stands today." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat Icon={UserCheck} n="72%" label="Profile completion" />
        <Stat Icon={TrendingUp} n="84" label="Career readiness" />
        <Stat Icon={FileText} n="6" label="Active applications" />
        <Stat Icon={Eye} n="23" label="Recruiter views" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Widget title="Recommended Jobs" action="View all">
            <div className="space-y-2">
              <Row title="Senior Frontend Engineer" sub="Northwind Labs · Remote · US" right={<Badge n={96} />} />
              <Row title="Staff ML Engineer" sub="Hello Systems · San Francisco, CA" right={<Badge n={91} />} />
              <Row title="Full-Stack Developer" sub="Brightpath · Austin, TX" right={<Badge n={87} />} />
            </div>
          </Widget>
          <Widget title="Applications">
            <div className="space-y-2">
              <Row title="Data Engineer · Cobalt" sub="Applied 3 days ago" right={<span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">Interview</span>} />
              <Row title="AI Platform Engineer · Vela" sub="Applied 1 week ago" right={<span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">Screening</span>} />
              <Row title="Backend Engineer · Lumen" sub="Applied 2 weeks ago" right={<span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">Submitted</span>} />
            </div>
          </Widget>
        </div>
        <div className="space-y-6">
          <Widget title="Profile Completion">
            <Bar label="Overall" v={72} />
            <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground"><li>• Upload your resume</li><li>• Add a portfolio link</li></ul>
          </Widget>
          <Widget title="Career Readiness">
            <div className="space-y-3"><Bar label="Technical skills" v={88} /><Bar label="Experience" v={79} /><Bar label="Market demand" v={85} /></div>
          </Widget>
          <Widget title="Recruiter Activity">
            <div className="space-y-2 text-sm"><p><b>Talent team at Northwind</b> viewed your profile</p><p><b>Hello Systems</b> saved you to a pipeline</p></div>
          </Widget>
          <Widget title="Job Alerts">
            <div className="flex items-start gap-2 text-sm"><Bell className="mt-0.5 h-4 w-4 text-primary" /><span>4 new React roles match your alert "Remote frontend"</span></div>
          </Widget>
        </div>
      </div>
    </>
  );
}

export function RecruiterDashboard({ account }: { account: Account }) {
  return (
    <>
      <PageHeader title={`Welcome back, ${account.firstName || "there"}`} subtitle="Your hiring at a glance." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat Icon={Briefcase} n="12" label="Active jobs" />
        <Stat Icon={Users} n="348" label="Candidate matches" />
        <Stat Icon={CalendarCheck} n="27" label="Interviews" />
        <Stat Icon={TrendingUp} n="18d" label="Avg. time to hire" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Widget title="Hiring Pipeline">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[["Sourced", 42], ["Screening", 18], ["Interview", 9], ["Offer", 3]].map(([l, n]) => (
                <div key={l} className="rounded-xl bg-primary-soft/60 p-4"><div className="text-xs font-semibold text-muted-foreground">{l}</div><div className="mt-1 text-2xl font-extrabold text-primary">{n}</div></div>
              ))}
            </div>
          </Widget>
          <Widget title="Candidate Matches" action="View all">
            <div className="space-y-2">
              <Row title="Priya Raman" sub="Senior React Engineer · Seattle" right={<Badge n={97} />} />
              <Row title="Marcus Lee" sub="Full-Stack Engineer · Remote" right={<Badge n={92} />} />
              <Row title="Elena Torres" sub="Data Engineer · Austin" right={<Badge n={89} />} />
            </div>
          </Widget>
          <Widget title="Active Jobs">
            <div className="space-y-2">
              <Row title="Senior Frontend Engineer" sub="48 matches · Posted 5 days ago" right={<span className="text-xs font-semibold text-success">Open</span>} />
              <Row title="ML Platform Engineer" sub="31 matches · Posted 2 weeks ago" right={<span className="text-xs font-semibold text-success">Open</span>} />
            </div>
          </Widget>
        </div>
        <div className="space-y-6">
          <Widget title="Interviews">
            <div className="space-y-2">
              <Row title="Priya Raman" sub="Today · 2:00 PM" right={<CalendarCheck className="h-4 w-4 text-primary" />} />
              <Row title="David Okafor" sub="Tomorrow · 11:00 AM" right={<CalendarCheck className="h-4 w-4 text-primary" />} />
            </div>
          </Widget>
          <Widget title="Candidate Alerts">
            <div className="flex items-start gap-2 text-sm"><Sparkles className="mt-0.5 h-4 w-4 text-primary" /><span>6 new candidates match "Senior Frontend Engineer"</span></div>
          </Widget>
          <Widget title="Recent Activity">
            <ul className="space-y-2 text-sm text-muted-foreground"><li>Marcus Lee moved to Interview</li><li>Elena Torres applied to Data Engineer</li><li>Offer sent to Jordan Price</li></ul>
          </Widget>
        </div>
      </div>
    </>
  );
}
