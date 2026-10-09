import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ShieldCheck, Undo2 } from "lucide-react";
import { card, friendlyError, inputCls } from "@/components/profile/parts";
import { btn, primaryBtn } from "@/components/talent/Talent";
import { formatSalaryAmount } from "@/lib/salary";
import { myOfferApprovals, reviewOfferApproval } from "@/lib/offers-data";
import { salaryWarning } from "@/lib/pipeline-guardrails";
import { notifyOfferEvent } from "@/lib/offer-email.functions";

type Row = Awaited<ReturnType<typeof myOfferApprovals>>[number];
const fmtDate = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—");

/** Approver inbox: offers teammates routed to the signed-in recruiter for sign-off. */
export function OfferApprovals() {
  const q = useQuery({ queryKey: ["offer-approvals"], queryFn: myOfferApprovals });
  const rows = q.data ?? [];
  const waiting = rows.filter((r) => r.status === "pending_approval");
  const done = rows.filter((r) => r.status !== "pending_approval");
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold"><ShieldCheck className="h-6 w-6 text-primary" />Offer Approvals</h1>
        <p className="text-sm text-muted-foreground">Offers your teammates want to send. Candidates only see them after you approve.</p>
      </header>
      {q.isLoading ? <div className="h-32 animate-pulse rounded-2xl bg-muted" /> : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Waiting for you ({waiting.length})</h2>
            {waiting.length === 0 ? <p className={`${card} p-6 text-sm text-muted-foreground`}>Nothing to approve right now.</p> : waiting.map((r) => <ApprovalCard key={r.offer_id} r={r} />)}
          </section>
          {done.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Recently reviewed</h2>
              {done.map((r) => (
                <div key={r.offer_id} className={`${card} flex flex-wrap items-center justify-between gap-2 p-3 text-sm`}>
                  <span><strong>{r.candidate_name}</strong> · {r.job_title} · {formatSalaryAmount(r.salary_amount, r.salary_currency)}</span>
                  <span className="text-xs font-semibold text-muted-foreground">{r.status === "approval_declined" ? "Sent back for changes" : r.approved_at ? "Approved" : r.status}</span>
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ApprovalCard({ r }: { r: Row }) {
  const qc = useQueryClient();
  const [note, setNote] = useState(""), [busy, setBusy] = useState(false), [sendBack, setSendBack] = useState(false);
  const warn = salaryWarning(r.salary_amount, r.min_salary, r.max_salary, r.salary_currency);
  async function decide(approve: boolean) {
    setBusy(true);
    try {
      await reviewOfferApproval(r.offer_id, approve, note);
      toast.success(approve ? "Approved — the offer is now with the candidate" : "Sent back to the recruiter");
      if (approve) void notifyOfferEvent({ data: { offerId: r.offer_id, event: "sent" } }).catch(() => {});
      qc.invalidateQueries({ queryKey: ["offer-approvals"] });
    } catch (e) { toast.error(friendlyError(e, e instanceof Error ? e.message : "Couldn't save your decision.")); }
    setBusy(false);
  }
  return (
    <article className={`${card} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-lg font-extrabold">{r.candidate_name}</h3>
          <p className="text-sm text-muted-foreground">{r.job_title} · requested by {r.recruiter_name}</p>
        </div>
        <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-bold text-primary">⏳ Awaiting your approval</span>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div><dt className="text-muted-foreground">Base salary</dt><dd className="font-display text-lg font-extrabold">{formatSalaryAmount(r.salary_amount, r.salary_currency) || "—"}</dd></div>
        <div><dt className="text-muted-foreground">Signing bonus</dt><dd className="font-semibold">{r.signing_bonus ? formatSalaryAmount(r.signing_bonus, r.salary_currency) : "—"}</dd></div>
        <div><dt className="text-muted-foreground">Job budget</dt><dd className="font-semibold">{r.min_salary || r.max_salary ? `${formatSalaryAmount(r.min_salary, r.salary_currency) || "?"} – ${formatSalaryAmount(r.max_salary, r.salary_currency) || "?"}` : "Not set"}</dd></div>
        <div><dt className="text-muted-foreground">Equity</dt><dd className="font-semibold">{r.equity_details || "—"}</dd></div>
        <div><dt className="text-muted-foreground">Start date</dt><dd className="font-semibold">{fmtDate(r.start_date)}</dd></div>
        <div><dt className="text-muted-foreground">Respond by</dt><dd className="font-semibold">{fmtDate(r.expires_on)}</dd></div>
      </dl>
      {warn && <p role="alert" className="mt-3 rounded-xl bg-warning/15 px-3 py-2 text-sm font-semibold">{warn}</p>}
      {r.notes && <p className="mt-3 whitespace-pre-line rounded-xl bg-muted px-3 py-2 text-sm">{r.notes}</p>}
      {sendBack && <textarea aria-label="What should change?" rows={3} maxLength={1000} className={`${inputCls} mt-4`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Keep base within budget; offer a larger signing bonus instead." />}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {sendBack ? (
          <>
            <button type="button" className={btn} onClick={() => setSendBack(false)}>Cancel</button>
            <button type="button" className={`${btn} text-destructive`} disabled={busy || note.trim().length < 3} onClick={() => decide(false)}><Undo2 className="mr-1 h-4 w-4" />Send Back</button>
          </>
        ) : (
          <>
            <button type="button" className={btn} onClick={() => setSendBack(true)}>Request Changes</button>
            <button type="button" className={primaryBtn} disabled={busy} onClick={() => decide(true)}><CheckCircle2 className="mr-1 h-4 w-4" />Approve & Send</button>
          </>
        )}
      </div>
    </article>
  );
}
