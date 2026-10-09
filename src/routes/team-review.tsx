import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { CheckCircle2, Star, XCircle } from "lucide-react";
import { getProfileReview, getReviewMode, getTeamReview, submitProfileReview, submitTeamReview } from "@/lib/team-review.functions";
import { VERDICTS } from "@/lib/team-review";

export const Route = createFileRoute("/team-review")({
  validateSearch: z.object({ t: z.string().optional(), pick: z.string().optional() }),
  staticData: { sitemap: false },
  head: () => ({ meta: [
    { title: "Hiring Team Review — Sundance Professionals" },
    { name: "description", content: "Recommend a candidate to your recruiter in one tap." },
    { property: "og:title", content: "Hiring Team Review — Sundance Professionals" },
    { property: "og:description", content: "Recommend a candidate to your recruiter in one tap." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: TeamReview,
});

const NONE = "none";

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-background px-4 py-10"><div className="mx-auto max-w-2xl"><p className="mb-6 font-display text-sm font-bold text-primary">Sundance Professionals</p>{children}</div></main>;
}

function TeamReview() {
  const { t = "" } = Route.useSearch();
  const mode = useServerFn(getReviewMode);
  const q = useQuery({ queryKey: ["team-review-mode", t], queryFn: () => mode({ data: { token: t } }), enabled: t.length >= 20, retry: false });
  if (t.length < 20) return <Shell><Msg title="Link not found" text="Open the review link from your email again." /></Shell>;
  if (q.isLoading) return <Shell><div className="h-64 animate-pulse rounded-2xl border border-border bg-card" /></Shell>;
  if (q.error || !q.data) return <Shell><Msg title="Link unavailable" text={q.error instanceof Error ? q.error.message : "This review link is not valid."} /></Shell>;
  return q.data.mode === "profile" ? <ProfileReview t={t} /> : <CompareReview />;
}

function ProfileReview({ t }: { t: string }) {
  const load = useServerFn(getProfileReview);
  const submit = useServerFn(submitProfileReview);
  const q = useQuery({ queryKey: ["profile-review", t], queryFn: () => load({ data: { token: t } }), retry: false });
  const [verdict, setVerdict] = useState("");
  const [fb, setFb] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { if (q.data?.current) { setVerdict(q.data.current.verdict); setFb(q.data.current.feedback); } }, [q.data]);
  if (q.isLoading) return <Shell><div className="h-64 animate-pulse rounded-2xl border border-border bg-card" /></Shell>;
  if (q.error || !q.data) return <Shell><Msg title="Link unavailable" text={q.error instanceof Error ? q.error.message : "This review link is not valid."} /></Shell>;
  const d = q.data; const c = d.candidate;
  async function send() {
    setBusy(true); setErr("");
    try { await submit({ data: { token: t, verdict, feedback: fb } }); setDone(true); }
    catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong."); }
    setBusy(false);
  }
  if (done) return <Shell><div className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft"><CheckCircle2 className="mx-auto h-12 w-12 text-success" /><h1 className="mt-4 font-display text-2xl font-extrabold">Thank you{d.reviewer ? `, ${d.reviewer.split(" ")[0]}` : ""}!</h1><p className="mt-2 text-muted-foreground">Your feedback on <b className="text-foreground">{c.name}</b> was sent to {d.recruiter}.</p><button onClick={() => setDone(false)} className="mt-6 text-sm font-semibold text-primary hover:underline">Change my answer</button></div></Shell>;
  const chips = (title: string, xs: string[]) => xs.length ? <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p><div className="mt-1.5 flex flex-wrap gap-1.5">{xs.map((x) => <span key={x} className="rounded-full border border-border px-2.5 py-0.5 text-xs">{x}</span>)}</div></div> : null;
  return <Shell><div className="space-y-5">
    <div><h1 className="font-display text-2xl font-extrabold sm:text-3xl">Should {c.name} move forward?</h1><p className="mt-1 text-muted-foreground"><b className="text-foreground">{d.jobTitle}</b>{d.company ? <> at <b className="text-primary">{d.company}</b></> : null} · shared by {d.recruiter}</p></div>
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary font-bold text-primary-foreground">{c.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}</div><div className="min-w-0 flex-1"><p className="font-display text-lg font-bold">{c.name}</p><p className="text-sm text-muted-foreground">{[c.jobTitle, c.years != null ? `${c.years} yrs` : ""].filter(Boolean).join(" · ")}</p></div>{c.score != null && <span className="rounded-full bg-muted px-2.5 py-1 text-sm font-bold">{c.score}% match</span>}</div>
      {c.headline && <p className="font-medium">{c.headline}</p>}{c.summary && <p className="whitespace-pre-line text-sm text-muted-foreground">{c.summary}</p>}
      {c.strengths.length > 0 && <div className="flex flex-wrap gap-1.5">{c.strengths.map((s) => <span key={s} className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs text-primary">✓ {s}</span>)}</div>}
      {c.experience.length > 0 && <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Experience</p><ol className="mt-2 space-y-3">{c.experience.map((e, i) => <li key={i} className="border-l-2 border-primary/30 pl-3"><p className="text-sm font-semibold">{e.title} · {e.company}</p><p className="text-xs text-muted-foreground">{e.start ?? "?"} – {e.end ?? "?"}</p>{e.summary && <p className="mt-1 whitespace-pre-line text-sm">{e.summary}</p>}</li>)}</ol></div>}
      {chips("Programming languages", c.languages)}{chips("Technologies & tools", c.technologies)}{chips("Technical skills", c.skills)}
      {c.education.length > 0 && <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Education</p><ul className="mt-1 space-y-1 text-sm">{c.education.map((e) => <li key={e}>{e}</li>)}</ul></div>}
    </section>
    <div role="radiogroup" aria-label="Your recommendation" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {VERDICTS.map((v) => <button key={v.value} role="radio" aria-checked={verdict === v.value} onClick={() => setVerdict(v.value)} className={`rounded-xl border bg-card p-3 text-sm font-semibold ${verdict === v.value ? "border-primary ring-2 ring-primary/25" : "border-border hover:border-primary/40"}`}>{v.label}</button>)}
    </div>
    <label className="block"><span className="text-sm font-semibold">Notes for {d.recruiter.split(" ")[0]} <span className="font-normal text-muted-foreground">(optional, private)</span></span>
      <textarea value={fb} onChange={(e) => setFb(e.target.value.slice(0, 1000))} rows={4} placeholder="Strengths, concerns, what to probe in the interview…" className="mt-1.5 w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary" /></label>
    {err && <p className="text-sm text-destructive">{err}</p>}
    <button onClick={send} disabled={!verdict || busy} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-50"><Star className="h-4 w-4" />{busy ? "Sending…" : "Send feedback"}</button>
    <p className="text-center text-xs text-muted-foreground">No sign-in needed. For privacy, contact details and current employer are hidden.</p>
  </div></Shell>;
}

function CompareReview() {
  const { t = "", pick: initial } = Route.useSearch();
  const load = useServerFn(getTeamReview);
  const submit = useServerFn(submitTeamReview);
  const q = useQuery({ queryKey: ["team-review", t], queryFn: () => load({ data: { token: t } }), enabled: t.length >= 20, retry: false });
  const [pick, setPick] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!q.data) return;
    const ids = q.data.candidates.map((c) => c.id);
    setPick(initial && ids.includes(initial) ? initial : q.data.current ? (q.data.current.pick ?? NONE) : null);
    if (q.data.current?.note) setNote(q.data.current.note);
  }, [q.data, initial]);

  async function send() {
    if (!pick) return;
    setBusy(true); setErr("");
    try { await submit({ data: { token: t, pick: pick === NONE ? null : pick, note } }); setDone(true); }
    catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong."); }
    setBusy(false);
  }

  const shell = (body: React.ReactNode) => (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <p className="mb-6 font-display text-sm font-bold text-primary">Sundance Professionals</p>
        {body}
      </div>
    </main>
  );

  if (t.length < 20) return shell(<Msg title="Link not found" text="Open the review link from your email again." />);
  if (q.isLoading) return shell(<div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />);
  if (q.error || !q.data) return shell(<Msg title="Link unavailable" text={q.error instanceof Error ? q.error.message : "This review link is not valid."} />);
  const d = q.data;
  const chosen = d.candidates.find((c) => c.id === pick);

  if (done) return shell(
    <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
      <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
      <h1 className="mt-4 font-display text-2xl font-extrabold">Thank you{d.reviewer ? `, ${d.reviewer.split(" ")[0]}` : ""}!</h1>
      <p className="mt-2 text-muted-foreground">{chosen ? <>Your recommendation for <b className="text-foreground">{chosen.name}</b> was sent to {d.recruiter}.</> : <>{d.recruiter} now knows you'd like more candidates.</>}</p>
      <button onClick={() => setDone(false)} className="mt-6 text-sm font-semibold text-primary hover:underline">Change my answer</button>
    </div>,
  );

  return shell(
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Who should move forward?</h1>
        <p className="mt-1 text-muted-foreground"><b className="text-foreground">{d.jobTitle}</b>{d.company ? <> at <b className="text-primary">{d.company}</b></> : null} · shared by {d.recruiter}</p>
      </div>
      <div role="radiogroup" aria-label="Choose a candidate" className="space-y-3">
        {d.candidates.map((c, i) => (
          <button key={c.id} role="radio" aria-checked={pick === c.id} onClick={() => setPick(c.id)}
            className={`w-full rounded-2xl border bg-card p-4 text-left transition-all ${pick === c.id ? "border-primary ring-2 ring-primary/25" : "border-border hover:border-primary/40"}`}>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{c.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}</div>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{c.name} {i === 0 && c.score != null ? <span className="ml-1 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary">AI TOP PICK</span> : null}</p>
                <p className="truncate text-sm text-muted-foreground">{[c.jobTitle, c.years != null ? `${c.years} yrs` : ""].filter(Boolean).join(" · ")}</p>
              </div>
              {c.score != null && <span className="rounded-full bg-muted px-2.5 py-1 text-sm font-bold">{c.score}%</span>}
            </div>
            {c.strengths.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{c.strengths.map((s) => <span key={s} className="rounded-full border border-border px-2.5 py-0.5 text-xs">✓ {s}</span>)}</div>}
          </button>
        ))}
        <button role="radio" aria-checked={pick === NONE} onClick={() => setPick(NONE)}
          className={`flex w-full items-center gap-2 rounded-2xl border bg-card p-4 text-left text-sm font-semibold transition-all ${pick === NONE ? "border-primary ring-2 ring-primary/25" : "border-border hover:border-primary/40"}`}>
          <XCircle className="h-4 w-4 text-muted-foreground" /> None of these fit — request more candidates
        </button>
      </div>
      <label className="block">
        <span className="text-sm font-semibold">Any notes for {d.recruiter.split(" ")[0]}? <span className="font-normal text-muted-foreground">(optional)</span></span>
        <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 500))} placeholder="e.g. Strong PyTorch background, fits our roadmap"
          className="mt-1.5 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary" />
      </label>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <button onClick={send} disabled={!pick || busy}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-50">
        <Star className="h-4 w-4" />{busy ? "Sending…" : chosen ? `Recommend ${chosen.name}` : pick === NONE ? "Request more candidates" : "Choose a candidate"}
      </button>
      <p className="text-center text-xs text-muted-foreground">No sign-in needed. For privacy, candidates show first name and last initial only.</p>
    </div>,
  );
}

function Msg({ title, text }: { title: string; text: string }) {
  return <div className="rounded-2xl border border-border bg-card p-8 text-center"><h1 className="font-display text-xl font-bold">{title}</h1><p className="mt-2 text-muted-foreground">{text}</p></div>;
}
