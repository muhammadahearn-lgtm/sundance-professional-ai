import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { getRefereeForm, submitRefereeForm } from "@/lib/references.functions";
import { relationshipLabel } from "@/lib/references";

export const Route = createFileRoute("/reference-check")({
  validateSearch: z.object({ t: z.string().optional() }),
  staticData: { sitemap: false },
  head: () => ({ meta: [
    { title: "Give a Reference — Sundance Professionals" },
    { name: "description", content: "Share a short, confidential professional reference in about two minutes." },
    { property: "og:title", content: "Give a Reference — Sundance Professionals" },
    { property: "og:description", content: "Share a short, confidential professional reference in about two minutes." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: ReferenceCheck,
});

const field = "mt-1 w-full rounded-xl border border-input bg-background p-3 text-sm";

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-background px-4 py-10"><div className="mx-auto max-w-xl"><p className="mb-6 font-display text-sm font-bold text-primary">Sundance Professionals</p>{children}</div></main>;
}
function Msg({ title, text }: { title: string; text: string }) {
  return <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft"><h1 className="font-display text-xl font-bold">{title}</h1><p className="mt-2 text-sm text-muted-foreground">{text}</p></div>;
}

function ReferenceCheck() {
  const { t = "" } = Route.useSearch();
  const get = useServerFn(getRefereeForm);
  const submit = useServerFn(submitRefereeForm);
  const q = useQuery({ queryKey: ["referee-form", t], queryFn: () => get({ data: { token: t } }), enabled: t.length >= 20, retry: false });
  const [confirmed, setConfirmed] = useState(true);
  const [rating, setRating] = useState(0);
  const [strengths, setStrengths] = useState("");
  const [growth, setGrowth] = useState("");
  const [rehire, setRehire] = useState("");
  const [confidential, setConfidential] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);

  if (t.length < 20) return <Shell><Msg title="Link not found" text="Open the reference link from your email again." /></Shell>;
  if (q.isLoading) return <Shell><div className="h-80 animate-pulse rounded-2xl border border-border bg-card" /></Shell>;
  if (q.error || !q.data) return <Shell><Msg title="Link unavailable" text={q.error instanceof Error ? q.error.message : "This reference link is not valid."} /></Shell>;
  const d = q.data;
  if (sent || d.done) return <Shell><div className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft"><CheckCircle2 className="mx-auto h-10 w-10 text-success" /><h1 className="mt-3 font-display text-xl font-bold">Thank you, {d.referee}!</h1><p className="mt-2 text-sm text-muted-foreground">Your reference was sent to the recruiter. {d.candidate} will not see your answers.</p></div></Shell>;

  async function send() {
    setErr("");
    if (!rating) { setErr("Please choose a rating."); return; }
    if (!strengths.trim()) { setErr("Please share at least one strength."); return; }
    setBusy(true);
    try { await submit({ data: { token: t, confirmed, rating, strengths, growth, rehire, confidential } }); setSent(true); }
    catch (e) { setErr(e instanceof Error ? e.message : "Could not send. Please try again."); }
    setBusy(false);
  }

  return (
    <Shell>
      <div className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div><h1 className="font-display text-2xl font-extrabold">Reference for {d.candidate}</h1>
          <p className="mt-1 text-sm text-muted-foreground">For {d.jobTitle}{d.company ? ` at ${d.company}` : ""}. About 2 minutes. Your answers go only to the recruiter — never to {d.candidate}.</p></div>
        <label className="flex items-start gap-2 rounded-xl bg-muted p-3 text-sm">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />
          <span>I confirm I worked with {d.candidate} as their <b>{relationshipLabel(d.relationship)}</b>{d.refCompany ? <> at <b>{d.refCompany}</b></> : null}{d.workedTogether ? <> ({d.workedTogether})</> : null}.</span>
        </label>
        <div><p className="text-sm font-semibold">Would you hire or work with them again?</p>
          <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Rating">{[1, 2, 3, 4, 5].map((n) => (
            <button key={n} role="radio" aria-checked={rating === n} onClick={() => setRating(n)} className={`h-11 w-11 rounded-xl border text-sm font-bold ${rating === n ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"}`}>{n}</button>))}</div>
          <p className="mt-1 text-xs text-muted-foreground">1 = No · 5 = Absolutely</p></div>
        <label className="block text-sm"><span className="font-semibold">Top strengths & contributions *</span><textarea value={strengths} onChange={(e) => setStrengths(e.target.value.slice(0, 1500))} rows={4} className={field} /></label>
        <label className="block text-sm"><span className="font-semibold">Areas for growth or coaching</span><textarea value={growth} onChange={(e) => setGrowth(e.target.value.slice(0, 1500))} rows={3} className={field} /></label>
        <label className="block text-sm"><span className="font-semibold">Anything else about working with them again?</span><textarea value={rehire} onChange={(e) => setRehire(e.target.value.slice(0, 1000))} rows={2} className={field} /></label>
        <label className="block text-sm"><span className="font-semibold">Confidential note for the recruiter (optional)</span><textarea value={confidential} onChange={(e) => setConfidential(e.target.value.slice(0, 1000))} rows={2} className={field} /></label>
        {err && <p role="alert" className="text-sm font-semibold text-destructive">{err}</p>}
        <button disabled={busy} onClick={send} className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Sending…" : "Send reference"}</button>
      </div>
    </Shell>
  );
}
