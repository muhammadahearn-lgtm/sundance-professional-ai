import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, CalendarDays, Gift, Handshake, Medal, MessageSquare, PartyPopper, Sparkles, Wallet } from "lucide-react";
import { card, friendlyError, inputCls } from "@/components/profile/parts";
import { btn, primaryBtn } from "@/components/talent/Talent";
import { DatePicker } from "@/components/ui/date-picker";
import { CURRENCIES, formatSalaryAmount } from "@/lib/salary";
import { canRequestExtension, daysLeft, emptyOffer, extensionDate, negotiateMessage, offerExpired, todayISO, validateOffer, type OfferForm } from "@/lib/offer-rules";
import { latestOffer, offersForApplication, requestNegotiation, requestOfferExtension, respondOfferExtension, respondToOffer, reviseOffer, sendOffer, withdrawOffer, wrapUpOthers, type Offer } from "@/lib/offers-data";
import { supabase } from "@/integrations/supabase/client";
import { SILVER_STAGES } from "@/lib/saved-candidates";
import { markSilverMedalists } from "@/lib/talent-data";
import { setJobStatus } from "@/lib/jobs-data";
import { openSpots, parseHeadcount } from "@/lib/job-rules";
import { overOfferWarning, salaryWarning } from "@/lib/pipeline-guardrails";
import { notifyOfferEvent } from "@/lib/offer-email.functions";
import { notifyApplicantsJobFilled } from "@/lib/job-closed-email.functions";

const Modal = ({ label, onClose, children, wide }: { label: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) => (
  <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" role="dialog" aria-modal="true" aria-label={label} onClick={onClose}>
    <div className={`${card} max-h-[92vh] w-full ${wide ? "max-w-xl" : "max-w-md"} overflow-y-auto p-6`} onClick={(e) => e.stopPropagation()}>{children}</div>
  </div>
);

const fmtDate = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—");
const fromOffer = (o: Offer): OfferForm => ({ salary: o.salary_amount ? String(o.salary_amount) : "", currency: o.salary_currency, bonus: o.signing_bonus ? String(o.signing_bonus) : "", equity: o.equity_details, startDate: o.start_date ?? "", expiresOn: o.expires_on ?? "", notes: o.notes });

/** Recruiter: send a new offer or revise the open one. `onSkip` advances the stage without formal terms. */
export function OfferDialog({ ctx, candidateName, jobTitle, existing, defaultSalary, defaultCurrency, onDone, onSkip, onClose }: {
  ctx: { uid: string; jobId: string; candidateId: string; applicationId: string | null };
  candidateName: string; jobTitle: string; existing?: Offer | null; defaultSalary?: number | null | undefined; defaultCurrency?: string | undefined;
  onDone: () => void; onSkip?: (() => void) | undefined; onClose: () => void;
}) {
  const revising = existing?.status === "pending";
  const [f, setF] = useState<OfferForm>(revising ? fromOffer(existing!) : emptyOffer(defaultCurrency ?? "USD", defaultSalary ?? null));
  const [show, setShow] = useState(false), [busy, setBusy] = useState(false);
  const errs = validateOffer(f, todayISO());
  const set = (k: keyof OfferForm) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const ctxQ = useQuery({ queryKey: ["offer-guard", ctx.jobId, ctx.candidateId], queryFn: async () => {
    const [jq, h, p] = await Promise.all([
      supabase.from("jobs").select("headcount, minimum_salary, maximum_salary").eq("job_id", ctx.jobId).maybeSingle(),
      supabase.from("recruiting_pipeline").select("candidate_id").eq("job_id", ctx.jobId).eq("current_stage", "hired"),
      supabase.from("job_offers").select("candidate_id").eq("job_id", ctx.jobId).eq("status", "pending").neq("candidate_id", ctx.candidateId),
    ]);
    return { headcount: parseHeadcount(jq.data?.headcount), min: jq.data?.minimum_salary ?? null, max: jq.data?.maximum_salary ?? null, hired: new Set((h.data ?? []).map((r) => r.candidate_id)).size, pending: new Set((p.data ?? []).map((r) => r.candidate_id)).size };
  } });
  const g = ctxQ.data;
  const overWarn = g && !revising ? overOfferWarning(g.headcount, g.hired, g.pending) : null;
  const salWarn = g ? salaryWarning(Number(f.salary) || null, g.min, g.max, f.currency) : null;
  async function submit() {
    if (Object.keys(errs).length) { setShow(true); return; }
    setBusy(true);
    try {
      if (revising) await reviseOffer(existing!.offer_id, f); else await sendOffer(ctx, f);
      toast.success(revising ? "Offer Revised" : "Offer Sent"); onDone();
      const id = revising ? existing!.offer_id : (await latestOffer(ctx.jobId, ctx.candidateId))?.offer_id;
      if (id) void notifyOfferEvent({ data: { offerId: id, event: "sent" } }).catch(() => {});
    }
    catch (e) { toast.error(friendlyError(e, e instanceof Error ? e.message : "Couldn't send the offer.")); }
    setBusy(false);
  }
  async function withdraw() {
    if (!existing || !confirm("Withdraw this offer? The candidate will no longer be able to accept it.")) return;
    try { await withdrawOffer(existing.offer_id); toast.success("Offer Withdrawn"); onDone(); } catch (e) { toast.error(friendlyError(e, "Couldn't withdraw.")); }
  }
  const err = (k: keyof typeof errs) => show && errs[k] ? <p className="mt-1 text-xs text-destructive">{errs[k]}</p> : null;
  return (
    <Modal label="Job offer" onClose={onClose} wide>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary"><Sparkles className="h-3 w-3" />{revising ? `Revision ${existing!.revision + 1}` : "Formal offer"}</span>
      <h2 className="mt-2 font-display text-xl font-extrabold">{revising ? "Revise offer for" : "Extend an offer to"} {candidateName}</h2>
      <p className="text-sm text-muted-foreground">{jobTitle}</p>
      {overWarn && <p role="alert" className="mt-4 rounded-xl bg-warning/15 px-3 py-2 text-sm font-semibold">{overWarn}</p>}
      <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_110px]">
        <label className="text-sm font-semibold">Base Salary (annual)<input inputMode="numeric" className={`${inputCls} mt-1`} value={f.salary} onChange={(e) => set("salary")(e.target.value)} placeholder="150000" />{err("salary")}{salWarn && <span role="alert" className="mt-1 block text-xs font-semibold text-foreground">{salWarn}</span>}</label>
        <label className="text-sm font-semibold">Currency<select className={`${inputCls} mt-1`} value={f.currency} onChange={(e) => set("currency")(e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="text-sm font-semibold">Signing Bonus (optional)<input inputMode="numeric" className={`${inputCls} mt-1`} value={f.bonus} onChange={(e) => set("bonus")(e.target.value)} placeholder="10000" />{err("bonus")}</label>
        <span />
        <label className="text-sm font-semibold sm:col-span-2">Equity (optional)<input className={`${inputCls} mt-1`} value={f.equity} onChange={(e) => set("equity")(e.target.value)} placeholder="e.g. 0.1% options, 4-year vest" />{err("equity")}</label>
        <div className="text-sm font-semibold">Start Date<div className="mt-1"><DatePicker value={f.startDate} onChange={set("startDate")} aria-label="Start date" placeholder="Pick a date" /></div>{err("startDate")}</div>
        <div className="text-sm font-semibold">Respond By<div className="mt-1"><DatePicker value={f.expiresOn} onChange={set("expiresOn")} aria-label="Offer deadline" placeholder="Optional" /></div>{err("expiresOn")}</div>
        <label className="text-sm font-semibold sm:col-span-2">Personal Note<textarea rows={4} maxLength={3000} className={`${inputCls} mt-1`} value={f.notes} onChange={(e) => set("notes")(e.target.value)} placeholder={`We'd love for you to join us as ${jobTitle}…`} />{err("notes")}</label>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
        {revising && <button type="button" onClick={withdraw} className={`${btn} mr-auto text-destructive`}>Withdraw Offer</button>}
        {!revising && onSkip && <button type="button" onClick={onSkip} className={`${btn} mr-auto`}>Skip, Move Stage Only</button>}
        <button type="button" onClick={onClose} className={btn}>Cancel</button>
        <button type="button" onClick={submit} disabled={busy} className={primaryBtn}>{busy ? "Sending…" : revising ? "Send Revised Offer" : "Send Official Offer"}</button>
      </div>
    </Modal>
  );
}

/** Recruiter: after a hire, offer to close the job and wrap up other candidates. */
export function HireDialog({ uid, name, jobId, jobTitle, candidateId, onClose }: { uid: string; name: string; jobId: string; jobTitle: string; candidateId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [close, setClose] = useState(true), [wrap, setWrap] = useState(true), [silver, setSilver] = useState(true), [busy, setBusy] = useState(false);
  const finalists = useQuery({ queryKey: ["finalists", jobId, candidateId], queryFn: async () => { const { data, error } = await supabase.from("recruiting_pipeline").select("candidate_id").eq("job_id", jobId).neq("candidate_id", candidateId).in("current_stage", [...SILVER_STAGES]); if (error) throw error; return (data ?? []).map((r) => r.candidate_id); } });
  const nFinal = finalists.data?.length ?? 0;
  const seats = useQuery({ queryKey: ["seats", jobId], queryFn: async () => {
    const [j, h] = await Promise.all([supabase.from("jobs").select("headcount").eq("job_id", jobId).maybeSingle(), supabase.from("recruiting_pipeline").select("candidate_id").eq("job_id", jobId).eq("current_stage", "hired")]);
    const headcount = parseHeadcount(j.data?.headcount); const hired = new Set((h.data ?? []).map((r) => r.candidate_id)).size;
    return { headcount, hired, open: openSpots(headcount, hired) };
  } });
  const remaining = seats.data?.open ?? 0;
  useEffect(() => { if (seats.data && seats.data.open > 0) { setClose(false); setWrap(false); setSilver(false); } }, [seats.data]);
  async function go() {
    setBusy(true);
    try {
      if (silver && nFinal) await markSilverMedalists(uid, finalists.data!, jobId);
      const closedIds = wrap ? await wrapUpOthers(jobId, candidateId) : [];
      if (close) await setJobStatus(jobId, "closed");
      if (close && closedIds.length) void notifyApplicantsJobFilled({ data: { jobId, applicationIds: closedIds } }).catch(() => {});
      toast.success(close ? "Job closed. Congratulations on the hire!" : "All set. Congratulations on the hire!");
      ["pipeline", "job-applications", "jobs", "job", "saved-entries"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onClose();
    } catch (e) { toast.error(friendlyError(e, "Couldn't finish wrapping up.")); }
    setBusy(false);
  }
  return (
    <Modal label="Candidate hired" onClose={onClose}>
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-success/15 text-success"><PartyPopper className="h-6 w-6" /></div>
      <h2 className="mt-3 font-display text-xl font-extrabold">{name} is hired!</h2>
      <p className="mt-1 text-sm text-muted-foreground">Congratulations on filling <strong className="text-foreground">{jobTitle}</strong>. Want to wrap things up?</p>
      {seats.data && seats.data.headcount > 1 && <p className={`mt-3 rounded-xl px-3 py-2 text-sm font-semibold ${remaining > 0 ? "bg-primary/10 text-primary" : "bg-success/15 text-success"}`}>{seats.data.hired} of {seats.data.headcount} spots filled{remaining > 0 ? ` · ${remaining} still open — keep the job running` : " · all openings filled"}</p>}
      <div className="mt-5 space-y-3 text-sm">
        <label className="flex items-start gap-3 rounded-xl border border-border p-3"><input type="checkbox" checked={close} onChange={(e) => setClose(e.target.checked)} className="mt-0.5" /><span><strong>Close this job</strong><span className="block text-muted-foreground">It leaves search and stops taking applications.</span></span></label>
        <label className="flex items-start gap-3 rounded-xl border border-border p-3"><input type="checkbox" checked={wrap} onChange={(e) => setWrap(e.target.checked)} className="mt-0.5" /><span><strong>Update everyone else</strong><span className="block text-muted-foreground">Send a kind "Not Moving Forward" update so nobody is left waiting.</span></span></label>
        {nFinal > 0 && <label className="flex items-start gap-3 rounded-xl border border-border p-3"><input type="checkbox" checked={silver} onChange={(e) => setSilver(e.target.checked)} className="mt-0.5" /><span><strong className="inline-flex items-center gap-1"><Medal className="h-4 w-4 text-primary" />Keep {nFinal} finalist{nFinal === 1 ? "" : "s"} as Silver Medalists</strong><span className="block text-muted-foreground">Save interviewed runners-up to Saved Candidates for future roles.</span></span></label>}
      </div>
      <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className={btn}>Not Now</button><button type="button" onClick={go} disabled={busy || (!close && !wrap && !(silver && nFinal))} className={primaryBtn}>{busy ? "Working…" : "Finish Up"}</button></div>
    </Modal>
  );
}

const STATUS_TEXT: Record<string, string> = { accepted: "You accepted this offer", declined: "You declined this offer", withdrawn: "This offer was withdrawn" };

/** Candidate: review the offer, accept, decline or start a negotiation. */
export function CandidateOfferCard({ applicationId, uid, jobId, jobTitle }: { applicationId: string; uid: string; jobId: string; jobTitle: string }) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const q = useQuery({ queryKey: ["offer", applicationId], queryFn: () => offersForApplication(applicationId) });
  const [dlg, setDlg] = useState<"accept" | "decline" | "extend" | null>(null), [extDays, setExtDays] = useState(3), [extNote, setExtNote] = useState(""), [reason, setReason] = useState(""), [busy, setBusy] = useState(false);
  const o = q.data;
  if (!o) return null;
  const today = todayISO();
  const expired = o.status === "pending" && offerExpired(o.expires_on, today);
  const left = daysLeft(o.expires_on, today);
  const refresh = () => ["offer", "my-application", "my-applications"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  async function respond(accept: boolean) {
    setBusy(true);
    try { await respondToOffer(o!.offer_id, accept, reason); toast.success(accept ? "Offer accepted. Congratulations!" : "Offer declined"); setDlg(null); refresh(); void notifyOfferEvent({ data: { offerId: o!.offer_id, event: accept ? "accepted" : "declined" } }).catch(() => {}); }
    catch (e) { toast.error(friendlyError(e, e instanceof Error ? e.message : "Couldn't respond.")); }
    setBusy(false);
  }
  async function negotiate() {
    setBusy(true);
    if (!o) return; try { const first = !o.negotiated_at; const id = (o.negotiated_at ? o.negotiation_conversation_id : null) ?? await requestNegotiation(o.offer_id, negotiateMessage(jobTitle)); if (first) void notifyOfferEvent({ data: { offerId: o.offer_id, event: "negotiation" } }).catch(() => {}); qc.invalidateQueries({ queryKey: ["offer", applicationId] }); nav({ to: "/candidate/messages/$conversationId", params: { conversationId: id } }); }
    catch (e) { toast.error(friendlyError(e, "Unable to start conversation")); }
    setBusy(false);
  }
  async function askExtension() {
    if (!o?.expires_on) return; setBusy(true);
    try { await requestOfferExtension(o.offer_id, extensionDate(o.expires_on, today, extDays), extNote.trim()); toast.success("Extension requested. The hiring team has been notified."); setDlg(null); refresh(); }
    catch (e) { toast.error(friendlyError(e, e instanceof Error ? e.message : "Couldn't request more time.")); }
    setBusy(false);
  }
  const canExtend = canRequestExtension(o, today);
  const Item = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <div className="rounded-2xl border border-border bg-card/80 p-3"><p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{icon}{label}</p><p className="mt-1 font-display text-lg font-extrabold">{value}</p></div>
  );
  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary-soft via-card to-card p-6 shadow-soft">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-card/80 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary"><Handshake className="h-3 w-3" />Job offer</span>
          {o.revision > 1 && <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-[11px] font-bold text-warning">Updated offer</span>}
          {o.status === "pending" && !expired && left !== null && <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">{left === 0 ? "Respond today" : `${left} day${left === 1 ? "" : "s"} to respond`}</span>}
        </div>
        <h2 className="mt-2 font-display text-xl font-extrabold">{o.status === "pending" ? (expired ? "This offer has expired" : "You received an offer!") : STATUS_TEXT[o.status]}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Item icon={<Wallet className="h-3.5 w-3.5" />} label="Base salary" value={formatSalaryAmount(o.salary_amount, o.salary_currency) || "—"} />
          <Item icon={<Gift className="h-3.5 w-3.5" />} label="Signing bonus" value={o.signing_bonus ? formatSalaryAmount(o.signing_bonus, o.salary_currency) : "—"} />
          <Item icon={<CalendarDays className="h-3.5 w-3.5" />} label="Start date" value={fmtDate(o.start_date)} />
          <Item icon={<CalendarDays className="h-3.5 w-3.5" />} label="Respond by" value={fmtDate(o.expires_on)} />
        </div>
        {o.equity_details && <p className="mt-3 text-sm"><strong>Equity:</strong> {o.equity_details}</p>}
        {o.notes && <blockquote className="mt-3 whitespace-pre-line rounded-2xl border-l-4 border-primary/40 bg-card/70 p-3 text-sm">{o.notes}</blockquote>}
        {o.status === "pending" && !expired && o.negotiated_at && (
          <div className="mt-4 rounded-2xl border border-accent bg-accent/40 p-3 text-sm"><p className="flex items-center gap-1.5 font-semibold"><MessageSquare className="h-4 w-4" />Discussion started {fmtDate(o.negotiated_at.slice(0, 10))}</p><p className="mt-1 text-muted-foreground">The hiring team has been notified. Keep chatting in Messages, then accept or decline once you're ready.</p></div>)}
        {o.status === "pending" && o.extension_status === "requested" && o.extension_requested_until && (
          <div className="mt-4 rounded-2xl border border-warning/40 bg-warning/10 p-3 text-sm"><p className="flex items-center gap-1.5 font-semibold"><CalendarClock className="h-4 w-4" />Extension requested until {fmtDate(o.extension_requested_until)}</p><p className="mt-1 text-muted-foreground">Your recruiter has been notified.</p></div>)}
        {o.status === "pending" && o.extension_status === "granted" && !expired && <p className="mt-4 text-sm font-semibold text-success">✓ Extension granted. New deadline {fmtDate(o.expires_on)}.</p>}
        {o.status === "pending" && o.extension_status === "declined" && <p className="mt-4 text-sm text-muted-foreground">The hiring team kept the original deadline.</p>}
        {expired && canExtend && <div className="mt-5"><button onClick={() => setDlg("extend")} className={primaryBtn}><CalendarClock className="h-4 w-4" />Request More Time</button></div>}
        {o.status === "pending" && !expired && (
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => setDlg("accept")} className={primaryBtn}>Accept Offer</button>
            <button onClick={negotiate} disabled={busy} className={btn}><MessageSquare className="h-4 w-4" />{o.negotiated_at ? "Open Conversation" : "Discuss / Negotiate"}</button>
            {canExtend && <button onClick={() => setDlg("extend")} className={btn}><CalendarClock className="h-4 w-4" />Request More Time</button>}
            <button onClick={() => setDlg("decline")} className={btn}>Decline</button>
          </div>)}
      </div>
      {dlg === "accept" && <Modal label="Accept offer" onClose={() => setDlg(null)}>
        <h2 className="font-display text-lg font-extrabold">Accept this offer?</h2>
        <p className="mt-2 text-sm text-muted-foreground">You'll be marked as hired for {jobTitle}. The hiring team is notified right away and the role closes to new applicants.</p>
        <div className="mt-6 flex justify-end gap-2"><button onClick={() => setDlg(null)} className={btn}>Not yet</button><button onClick={() => respond(true)} disabled={busy} className={primaryBtn}>Yes, Accept</button></div></Modal>}
      {dlg === "extend" && o.expires_on && <Modal label="Request more time" onClose={() => setDlg(null)}>
        <h2 className="font-display text-lg font-extrabold">Ask for more time</h2>
        <p className="mt-2 text-sm text-muted-foreground">Current deadline: {fmtDate(o.expires_on)}</p>
        <div className="mt-4 flex flex-wrap gap-2">{[2, 3, 7].map((d) => <button key={d} type="button" onClick={() => setExtDays(d)} className={`${btn} ${extDays === d ? "border-primary text-primary" : ""}`}>+{d === 7 ? "1 week" : `${d} days`}</button>)}</div>
        <p className="mt-3 text-sm">New deadline: <strong>{fmtDate(extensionDate(o.expires_on, today, extDays))}</strong></p>
        <textarea rows={3} maxLength={500} className={`${inputCls} mt-3`} value={extNote} onChange={(e) => setExtNote(e.target.value)} placeholder="Optional: why you need more time" />
        <div className="mt-6 flex justify-end gap-2"><button onClick={() => setDlg(null)} className={btn}>Back</button><button onClick={askExtension} disabled={busy} className={primaryBtn}>Send Request</button></div></Modal>}
      {dlg === "decline" && <Modal label="Decline offer" onClose={() => setDlg(null)}>
        <h2 className="font-display text-lg font-extrabold">Decline this offer?</h2>
        <p className="mt-2 text-sm text-muted-foreground">Optionally share why. It helps the hiring team.</p>
        <textarea rows={3} maxLength={1000} className={`${inputCls} mt-3`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. I accepted another role" />
        <div className="mt-6 flex justify-end gap-2"><button onClick={() => setDlg(null)} className={btn}>Back</button><button onClick={() => respond(false)} disabled={busy} className={primaryBtn}>Decline Offer</button></div></Modal>}
    </div>
  );
}

/** Recruiter pipeline card: live status of the candidate's formal offer. */
export function OfferPill({ jobId, candidateId, onOpen }: { jobId: string; candidateId: string; onOpen: () => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["offer-pill", jobId, candidateId], queryFn: () => latestOffer(jobId, candidateId) });
  const [extBusy, setExtBusy] = useState(false), [newDate, setNewDate] = useState("");
  async function answer(grant: boolean, until?: string) {
    if (!q.data) return; setExtBusy(true);
    try { await respondOfferExtension(q.data.offer_id, grant, until); toast.success(grant ? "Deadline extended" : "Extension declined"); setNewDate(""); qc.invalidateQueries({ queryKey: ["offer-pill", jobId, candidateId] }); }
    catch (e) { toast.error(friendlyError(e, e instanceof Error ? e.message : "Couldn't update the deadline.")); }
    setExtBusy(false);
  }
  const o = q.data;
  if (q.isLoading) return <div className="mt-2 h-8 animate-pulse rounded-lg bg-muted" />;
  if (!o || o.status === "withdrawn") return <button type="button" onClick={onOpen} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-primary/50 px-2 py-1.5 text-[11px] font-semibold text-primary hover:border-primary">+ Add Offer Terms</button>;
  const today = todayISO(), left = daysLeft(o.expires_on, today), expired = o.status === "pending" && offerExpired(o.expires_on, today);
  const [label, tone] = o.status === "accepted" ? ["Accepted", "text-success bg-success/15"] : o.status === "declined" ? ["Declined", "text-destructive bg-destructive/15"] : expired ? ["Expired", "text-destructive bg-destructive/15"] : o.extension_status === "requested" ? ["⏳ More time asked", "text-warning bg-warning/15"] : o.negotiated_at ? ["💬 Discussion requested", "text-accent-foreground bg-accent"] : left !== null && left <= 2 ? [left === 0 ? "Pending · due today" : `Pending · ${left}d left`, "text-warning bg-warning/15"] : [left !== null ? `Pending · ${left}d left` : "Pending", "text-primary bg-primary-soft"];
  return (
    <div className="mt-2 rounded-lg border border-border bg-card p-2 text-[11px]">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">✓ Offer sent{o.revision > 1 ? ` · Rev ${o.revision}` : ""}</span>
        <span className={`rounded-full px-2 py-0.5 font-bold ${tone}`}>{label}</span>
      </div>
      <p className="mt-1 font-display text-sm font-extrabold">{formatSalaryAmount(o.salary_amount, o.salary_currency) || "—"}</p>
      {o.status === "declined" && o.decline_reason && <p className="mt-1 text-muted-foreground">“{o.decline_reason}”</p>}
      {o.status === "pending" && o.extension_status === "requested" && o.extension_requested_until && (
        <div className="mt-1.5 rounded-md border border-warning/40 bg-warning/10 p-1.5">
          <p className="font-semibold text-warning">⚠ Extension requested · until {fmtDate(o.extension_requested_until)}</p>
          {o.extension_note && <p className="mt-0.5 text-muted-foreground">“{o.extension_note}”</p>}
          <div className="mt-1 flex gap-1"><button type="button" disabled={extBusy} onClick={() => answer(true)} className="flex-1 rounded-md bg-primary px-2 py-1 font-semibold text-primary-foreground">Grant</button><button type="button" disabled={extBusy} onClick={() => answer(false)} className="flex-1 rounded-md border border-border px-2 py-1 font-semibold">Decline</button></div>
        </div>)}
      {expired && o.extension_status !== "requested" && (
        <div className="mt-1.5 flex items-center gap-1"><div className="flex-1"><DatePicker value={newDate} onChange={setNewDate} aria-label="New offer deadline" placeholder="New deadline" /></div><button type="button" disabled={extBusy || !newDate} onClick={() => answer(true, newDate)} className="rounded-md bg-primary px-2 py-1.5 font-semibold text-primary-foreground disabled:opacity-50">Extend</button></div>)}
      {o.status === "pending" && o.negotiated_at && o.negotiation_conversation_id && <Link to="/recruiter/messages/$conversationId" params={{ conversationId: o.negotiation_conversation_id }} className="mt-1.5 block w-full rounded-md bg-primary px-2 py-1 text-center font-semibold text-primary-foreground hover:opacity-90">Open Chat</Link>}
      <button type="button" onClick={onOpen} className="mt-1.5 w-full rounded-md border border-border px-2 py-1 font-semibold hover:border-primary hover:text-primary">{o.status === "pending" ? "View / Revise" : "View Details"}</button>
    </div>
  );
}
