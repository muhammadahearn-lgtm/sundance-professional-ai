import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Check, CheckCircle2, Star, XCircle } from "lucide-react";
import { getTeamReview, submitTeamReview } from "@/lib/team-review.functions";

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

function TeamReview() {
  const { t = "", pick: initial } = Route.useSearch();
  const load = useServerFn(getTeamReview);
  const submit = useServerFn(submitTeamReview);
  const q = useQuery({ queryKey: ["team-review", t], queryFn: () => load({ data: { token: t } }), enabled: t.length >= 20, retry: false });
  const [picks, setPicks] = useState<string[]>([]);
  const [passAll, setPassAll] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!q.data) return;
    const ids = q.data.candidates.map((c) => c.id);
    const cur = q.data.current;
    if (initial === NONE) { setPicks([]); setPassAll(true); }
    else {
      const base = (cur?.picks ?? []).filter((p) => ids.includes(p));
      setPicks(initial && ids.includes(initial) && !base.includes(initial) ? [...base, initial] : base);
      setPassAll(!initial && !!cur?.passAll);
    }
    if (cur?.note) setNote(cur.note);
  }, [q.data, initial]);

  const toggle = (id: string) => { setPassAll(false); setPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])); };
  const choosePass = () => { setPicks([]); setPassAll((v) => !v); };

  async function send() {
    if (!picks.length && !passAll) return;
    setBusy(true); setErr("");
    try { await submit({ data: { token: t, picks: passAll ? [] : picks, note } }); setDone(true); }
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
  const chosen = d.candidates.filter((c) => picks.includes(c.id));
  const chosenText = chosen.length === 1 ? chosen[0]!.name : `${chosen.slice(0, -1).map((c) => c.name).join(", ")} and ${chosen[chosen.length - 1]?.name}`;

  if (done) return shell(
    <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
      <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
      <h1 className="mt-4 font-display text-2xl font-extrabold">Thank you{d.reviewer ? `, ${d.reviewer.split(" ")[0]}` : ""}!</h1>
      <p className="mt-2 text-muted-foreground">{chosen.length ? <>Your recommendation for <b className="text-foreground">{chosenText}</b> was sent to {d.recruiter}.</> : <>{d.recruiter} now knows you'd like more candidates.</>}</p>
      <button onClick={() => setDone(false)} className="mt-6 text-sm font-semibold text-primary hover:underline">Change my answer</button>
    </div>,
  );

  return shell(
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Who should move forward?</h1>
        <p className="mt-1 text-muted-foreground"><b className="text-foreground">{d.jobTitle}</b>{d.company ? <> at <b className="text-primary">{d.company}</b></> : null} · shared by {d.recruiter}</p>
        <p className="mt-1 text-sm text-muted-foreground">Select everyone you'd like to move forward — you can pick more than one.</p>
      </div>
      <div role="group" aria-label="Choose candidates" className="space-y-3">
        {d.candidates.map((c, i) => {
          const on = picks.includes(c.id);
          return (
          <button key={c.id} type="button" role="checkbox" aria-checked={on} onClick={() => toggle(c.id)}
            className={`w-full rounded-2xl border bg-card p-4 text-left transition-all ${on ? "border-primary ring-2 ring-primary/25" : "border-border hover:border-primary/40"}`}>
            <div className="flex items-center gap-3">
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{on && <Check className="h-4 w-4" />}</span>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{c.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}</div>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{c.name} {i === 0 && c.score != null ? <span className="ml-1 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary">AI TOP PICK</span> : null}</p>
                <p className="truncate text-sm text-muted-foreground">{[c.jobTitle, c.years != null ? `${c.years} yrs` : ""].filter(Boolean).join(" · ")}</p>
              </div>
              {c.score != null && <span className="rounded-full bg-muted px-2.5 py-1 text-sm font-bold">{c.score}%</span>}
            </div>
            {c.strengths.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{c.strengths.map((s) => <span key={s} className="rounded-full border border-border px-2.5 py-0.5 text-xs">✓ {s}</span>)}</div>}
          </button>); })}
        <button type="button" role="checkbox" aria-checked={passAll} onClick={choosePass}
          className={`flex w-full items-center gap-2 rounded-2xl border bg-card p-4 text-left text-sm font-semibold transition-all ${passAll ? "border-primary ring-2 ring-primary/25" : "border-border hover:border-primary/40"}`}>
          <XCircle className="h-4 w-4 text-muted-foreground" /> None of these fit — request more candidates
        </button>
      </div>
      <label className="block">
        <span className="text-sm font-semibold">Any notes for {d.recruiter.split(" ")[0]}? <span className="font-normal text-muted-foreground">(optional)</span></span>
        <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 500))} placeholder="e.g. Strong PyTorch background, fits our roadmap"
          className="mt-1.5 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary" />
      </label>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <button onClick={send} disabled={(!picks.length && !passAll) || busy}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-50">
        <Star className="h-4 w-4" />{busy ? "Sending…" : passAll ? "Request more candidates" : chosen.length === 1 ? `Recommend ${chosen[0]!.name}` : chosen.length ? `Recommend ${chosen.length} candidates` : "Choose candidates"}
      </button>
      <p className="text-center text-xs text-muted-foreground">No sign-in needed. For privacy, candidates show first name and last initial only.</p>
    </div>,
  );
}

function Msg({ title, text }: { title: string; text: string }) {
  return <div className="rounded-2xl border border-border bg-card p-8 text-center"><h1 className="font-display text-xl font-bold">{title}</h1><p className="mt-2 text-muted-foreground">{text}</p></div>;
}
