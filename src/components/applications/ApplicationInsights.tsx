import { useQuery } from "@tanstack/react-query";
import { Sparkles, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { canViewApplicationInsights, insightsEligible, standingText, type Insights } from "@/lib/application-insights";
import { card } from "@/components/profile/parts";

async function loadInsights(id: string): Promise<Insights | null> {
  const { data, error } = await supabase.rpc("get_candidate_application_insights", { _application: id });
  if (error) throw error;
  const r = data?.[0];
  if (!r || !r.your_status) return null;
  return { total: Number(r.total_applicants), inReview: Number(r.in_review), interviewing: Number(r.interviewing), offers: Number(r.offers), active: Number(r.active_pool), status: r.your_status };
}

export function ApplicationInsights({ applicationId, status }: { applicationId: string; status: string }) {
  const eligible = insightsEligible(status) && canViewApplicationInsights(false);
  const q = useQuery({ queryKey: ["app-insights", applicationId], queryFn: () => loadInsights(applicationId), enabled: eligible });
  if (!eligible || q.isError) return null;
  if (q.isLoading) return <div className={`${card} h-48 animate-pulse`} />;
  const i = q.data;
  if (!i) return null;
  const steps = [
    { key: "total", label: "Applied", n: i.total, here: false },
    { key: "review", label: "In review", n: i.inReview, here: ["viewed", "recruiter_contacted"].includes(i.status) },
    { key: "iv", label: "Interviewing", n: i.interviewing, here: i.status === "interviewing" },
    { key: "offer", label: "Offer", n: i.offers, here: ["offer", "hired"].includes(i.status) },
  ];
  const max = Math.max(1, i.total);
  return (
    <section className={`${card} relative overflow-hidden p-6`}>
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Users className="h-5 w-5 text-primary" />Applicant Pool Insights</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary"><Sparkles className="h-3 w-3" />Sundance Pro Preview</span>
      </div>
      <p className="relative mt-2 text-sm font-medium">{standingText(i)}</p>
      <ol className="relative mt-5 space-y-3">{steps.map((s) => (
        <li key={s.key} className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-3 text-sm">
          <span className={s.here ? "font-semibold text-primary" : "text-muted-foreground"}>{s.label}{s.here && " · You"}</span>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${s.here ? "bg-primary" : "bg-primary/35"}`} style={{ width: `${Math.max(s.n ? 4 : 0, (s.n / max) * 100)}%` }} /></div>
          <span className="text-right font-semibold tabular-nums">{s.n}</span>
        </li>))}</ol>
      <p className="relative mt-4 text-xs text-muted-foreground">Counts only — other applicants stay completely private. Free during launch.</p>
    </section>
  );
}
