import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { useCareer } from "@/components/career/Career";
import { MatchBadge, useAutoRecalc } from "@/components/match/Match";
import { useJobLists } from "@/components/candidate-jobs/useJobLists";
import { useCandidateLists } from "@/components/talent/Talent";
import { ContactRecruiterButton, MessageButton } from "@/components/messages/Messages";
import { PageHeader } from "@/components/app/AppShell";
import { loadCandidateRecs, loadRecruiterRecs, type RecruiterRecs } from "@/lib/recommend-data";
import { recTier, type Rec } from "@/lib/recommend-engine";
import { addToPipeline, moveStage } from "@/lib/applications-data";
import type { Stage } from "@/lib/talent-rules";

const card = "rounded-2xl border border-border bg-card p-5 shadow-soft";
const toneCls = { success: "bg-success/15 text-success", primary: "bg-primary-soft text-primary", warning: "bg-warning/15 text-warning", muted: "bg-muted text-muted-foreground" };
const btn = "rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted";
const btnP = "rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90";

export function RecScore({ score }: { score: number }) {
  const t = recTier(score);
  return <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${toneCls[t.tone]}`} title="Recommendation Score">{score}<span className="hidden font-semibold sm:inline">· {t.label}</span></span>;
}

/** One recommendation: score, why, expected value, action. */
function RecCard({ r, extra, actions }: { r: Rec; extra?: React.ReactNode; actions?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1"><p className="font-semibold">{r.title}</p>{r.subtitle && <p className="text-xs text-muted-foreground">{r.subtitle}</p>}</div>
        <RecScore score={r.score} />
      </div>
      {extra && <div className="mt-2 text-sm">{extra}</div>}
      <p className="mt-2 text-sm"><span className="font-semibold">Expected value:</span> {r.value}</p>
      <p className="text-sm"><span className="font-semibold">Recommended action:</span> {r.action}</p>
      <button onClick={() => setOpen(!open)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">Why This Recommendation? <ChevronDown className={`h-3 w-3 transition ${open ? "rotate-180" : ""}`} /></button>
      {open && <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">{r.why.map((w) => <li key={w}>• {w}</li>)}</ul>}
      {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
    </article>
  );
}

function Section({ title, empty, items, children }: { title: string; empty: string; items: unknown[]; children: React.ReactNode }) {
  return <section className={card}><h2 className="mb-3 font-display font-bold">{title} <span className="text-sm font-medium text-muted-foreground">({items.length})</span></h2>{items.length ? <div className="grid gap-3 md:grid-cols-2">{children}</div> : <p className="text-sm text-muted-foreground">{empty}</p>}</section>;
}
const Skel = () => <div className={`${card} h-40 animate-pulse`} />;
const Err = ({ retry }: { retry: () => void }) => <div className={card}><p className="font-semibold">Unable To Generate Recommendations</p><button onClick={retry} className={`${btnP} mt-3`}>Try again</button></div>;

// ---------------- Candidate ----------------

function useCandidateRecs(uid: string) {
  const { q: career } = useCareer(uid);
  return useQuery({ queryKey: ["match", "recs-cand", uid, career.dataUpdatedAt], queryFn: () => loadCandidateRecs(uid, career.data!), enabled: !!career.data });
}

export function CandidateRecommendationsPage({ uid }: { uid: string }) {
  const q = useCandidateRecs(uid);
  const lists = useJobLists(uid);
  return (
    <div className="space-y-5">
      <PageHeader title="Recommendations" subtitle="Ranked, explainable picks based on your matches, career intelligence and profile." />
      {q.error ? <Err retry={() => q.refetch()} /> : !q.data ? <><Skel /><Skel /></> : (
        <>
          <Section title="Recommended Jobs" empty="No new job recommendations — you've applied to every matching job, or none are open yet." items={q.data.jobs}>
            {q.data.jobs.slice(0, 10).map((r) => (
              <RecCard key={r.id} r={r} extra={<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><MatchBadge score={r.match} />{r.location && <span>{r.location}</span>}{r.salary && <span>· {r.salary}</span>}</div>}
                actions={<><Link to="/candidate/jobs/$id" params={{ id: r.jobId }} className={btn}>View Job</Link><Link to="/candidate/jobs/$id" params={{ id: r.jobId }} className={btnP}>Apply</Link><button onClick={() => lists.toggleSave(r.jobId)} className={btn}>{lists.isSaved(r.jobId) ? "Saved" : "Save Job"}</button><ContactRecruiterButton uid={uid} jobId={r.jobId} className={btn} /></>} />
            ))}
          </Section>
          <Section title="Recommended Skills" empty="No skill gaps found against current jobs." items={q.data.skills}>
            {q.data.skills.slice(0, 6).map((r) => <RecCard key={r.id} r={r} actions={<Link to="/candidate/profile" className={btn}>Update profile</Link>} />)}
          </Section>
          <Section title="Recommended Technologies" empty="No technology gaps found against current jobs." items={q.data.technologies}>
            {q.data.technologies.slice(0, 6).map((r) => <RecCard key={r.id} r={r} actions={<Link to="/candidate/profile" className={btn}>Update profile</Link>} />)}
          </Section>
          <Section title="Recommended Certifications" empty="No certification suggestions right now." items={q.data.certifications}>
            {q.data.certifications.slice(0, 6).map((r) => <RecCard key={r.id} r={r} />)}
          </Section>
          <Section title="Career Growth & Next Roles" empty="Add your job title and experience to see next-role suggestions." items={q.data.growth}>
            {q.data.growth.map((r) => (
              <RecCard key={r.id} r={r} extra={<div className="space-y-1 text-xs"><p><b>Career readiness:</b> {r.readiness}%</p><p><b>Required skills:</b> {r.skills.join(", ") || "—"}</p><p><b>Required technologies:</b> {r.technologies.join(", ") || "—"}</p><p><b>Expected salary increase:</b> {r.salaryIncrease}</p></div>} />
            ))}
          </Section>
        </>
      )}
    </div>
  );
}

export function CandidateRecsWidget({ uid }: { uid: string }) {
  const q = useCandidateRecs(uid);
  return (
    <section className={card}>
      <div className="mb-3 flex items-center gap-2"><Lightbulb className="h-4 w-4 text-primary" /><h2 className="font-display font-bold">Recommended For You</h2><Link to="/candidate/recommendations" className="ml-auto text-xs font-semibold text-primary hover:underline">View all</Link></div>
      {q.error ? <p className="text-sm text-muted-foreground">Unable To Generate Recommendations</p> : !q.data ? <div className="h-24 animate-pulse rounded-xl bg-muted" /> : (
        <ul className="space-y-2">
          {[...q.data.jobs.slice(0, 3).map((r) => ({ r, k: "Job", to: r.jobId })), ...q.data.skills.slice(0, 1).map((r) => ({ r, k: "Skill", to: null })), ...q.data.technologies.slice(0, 1).map((r) => ({ r, k: "Technology", to: null }))].map(({ r, k, to }) => (
            <li key={k + r.id} className="flex items-center gap-2 text-sm">
              <span className="w-20 shrink-0 text-xs text-muted-foreground">{k}</span>
              {to ? <Link to="/candidate/jobs/$id" params={{ id: to }} className="min-w-0 flex-1 truncate font-medium hover:text-primary">{r.title}</Link> : <span className="min-w-0 flex-1 truncate font-medium">{r.title}</span>}
              <RecScore score={r.score} />
            </li>
          ))}
          {!q.data.jobs.length && !q.data.skills.length && !q.data.technologies.length && <li className="text-sm text-muted-foreground">No recommendations yet — complete your profile to get started.</li>}
        </ul>
      )}
    </section>
  );
}

// ---------------- Recruiter ----------------

function useRecruiterRecs(uid: string) {
  const r = useAutoRecalc();
  return useQuery({ queryKey: ["match", "recs-rec", uid], queryFn: () => loadRecruiterRecs(uid), enabled: !r.isPending });
}

export function RecruiterRecommendationsPage({ uid }: { uid: string }) {
  const q = useRecruiterRecs(uid);
  const lists = useCandidateLists(uid);
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (key: string, fn: () => Promise<unknown>, msg: string) => {
    setBusy(key);
    try { await fn(); toast.success(msg); await qc.invalidateQueries({ queryKey: ["match", "recs-rec", uid] }); } catch { toast.error("Couldn't complete that action."); } finally { setBusy(null); }
  };
  const d: RecruiterRecs | undefined = q.data;
  return (
    <div className="space-y-5">
      <PageHeader title="Recommendations" subtitle="Ranked, explainable picks for candidates, pipeline moves and job improvements." />
      {q.error ? <Err retry={() => q.refetch()} /> : !d ? <><Skel /><Skel /></> : (
        <>
          <Section title="Recommended Candidates" empty="No new candidate recommendations. Publish a job or widen its requirements to see matches." items={d.candidates}>
            {d.candidates.slice(0, 10).map((r) => (
              <RecCard key={r.id} r={r} extra={<div className="space-y-1 text-xs text-muted-foreground"><div className="flex flex-wrap items-center gap-2"><MatchBadge score={r.match} /><span>for {r.jobTitle}</span>{r.availability && <span>· {r.availability}</span>}</div></div>}
                actions={<>
                  <Link to="/recruiter/candidates/$id" params={{ id: r.candidateId }} className={btn}>View Profile</Link>
                  <button onClick={() => lists.toggleSave(r.candidateId)} className={btn}>{lists.isSaved(r.candidateId) ? "Saved" : "Save Candidate"}</button>
                  <button disabled={busy === r.id} onClick={() => run(r.id, () => addToPipeline(uid, r.candidateId, r.jobId), "Added to pipeline")} className={btnP}>Add To Pipeline</button>
                  <MessageButton role="recruiter" candidateId={r.candidateId} jobId={r.jobId} label="Contact Candidate" className={btn} />
                </>} />
            ))}
          </Section>
          <Section title="Pipeline Recommendations" empty="Your pipeline is up to date." items={d.pipeline}>
            {d.pipeline.map((r) => (
              <RecCard key={r.id} r={r} actions={<>
                <Link to="/recruiter/candidates/$id" params={{ id: r.candidateId }} className={btn}>View Profile</Link>
                <MessageButton role="recruiter" candidateId={r.candidateId} label="Start Conversation" className={btn} />
                {r.nextStage && <button disabled={busy === r.id} onClick={() => run(r.id, () => moveStage({ pipeline_id: r.pipelineId, applicationId: d.appIdByPipeline[r.pipelineId] ?? null }, r.nextStage as Stage), "Pipeline updated")} className={btnP}>{r.action}</button>}
              </>} />
            ))}
          </Section>
          <Section title="Hiring Recommendations" empty="Your active jobs are attracting strong matches." items={d.hiring}>
            {d.hiring.map((r) => <RecCard key={r.id} r={r} actions={r.action === "Search Talent" ? <Link to="/recruiter/candidates" search={{ remote: true, sort: "match" }} className={btn}>Search Talent</Link> : <Link to="/recruiter/jobs/$id/edit" params={{ id: r.jobId }} className={btn}>Edit Job</Link>} />)}
          </Section>
          <section className={card}>
            <h2 className="mb-3 font-display font-bold">Recommended Searches</h2>
            {d.searches.length ? <div className="flex flex-wrap gap-2">{d.searches.map((s) => <Link key={s.jobId} to="/recruiter/candidates" search={{ role: s.roleId, sort: "match", mm: 60 }} className={btn}>Best matches for {s.title}</Link>)}</div> : <p className="text-sm text-muted-foreground">Set a role on your active jobs to get saved-search suggestions.</p>}
          </section>
        </>
      )}
    </div>
  );
}

export function RecruiterRecsWidget({ uid }: { uid: string }) {
  const q = useRecruiterRecs(uid);
  const d = q.data;
  return (
    <section className={card}>
      <div className="mb-3 flex items-center gap-2"><Lightbulb className="h-4 w-4 text-primary" /><h2 className="font-display font-bold">Recommendations</h2><Link to="/recruiter/recommendations" className="ml-auto text-xs font-semibold text-primary hover:underline">View all</Link></div>
      {q.error ? <p className="text-sm text-muted-foreground">Unable To Generate Recommendations</p> : !d ? <div className="h-24 animate-pulse rounded-xl bg-muted" /> : (
        <ul className="space-y-2">
          {[...d.candidates.slice(0, 3).map((r) => ({ r, k: "Candidate" })), ...d.pipeline.slice(0, 2).map((r) => ({ r, k: "Pipeline" })), ...d.hiring.slice(0, 1).map((r) => ({ r, k: "Hiring" }))].map(({ r, k }) => (
            <li key={k + r.id} className="flex items-center gap-2 text-sm"><span className="w-20 shrink-0 text-xs text-muted-foreground">{k}</span><span className="min-w-0 flex-1 truncate font-medium">{r.title}{r.subtitle && <span className="font-normal text-muted-foreground"> · {r.subtitle}</span>}</span><RecScore score={r.score} /></li>
          ))}
          {!d.candidates.length && !d.pipeline.length && !d.hiring.length && <li className="text-sm text-muted-foreground">No recommendations yet — publish a job to get started.</li>}
        </ul>
      )}
    </section>
  );
}
