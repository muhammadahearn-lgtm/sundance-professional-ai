import { useState } from "react";
import { CalendarX, Medal } from "lucide-react";
import { card, inputCls } from "@/components/profile/parts";
import { btn, primaryBtn } from "@/components/talent/Talent";
import { DISPOSITION_REASONS, type DispositionReason } from "@/lib/pipeline-guardrails";

/** Confirmation before closing a candidate for one role. Requires a reason; warns about (and cancels) an upcoming interview. */
export function NotMovingForwardDialog({ name, jobTitle, silverEligible, upcomingInterview, onConfirm, onCancel }: { name: string; jobTitle?: string | null | undefined; silverEligible?: boolean; upcomingInterview?: string | null | undefined; onConfirm: (silver: boolean, reason: DispositionReason) => void; onCancel: () => void }) {
  const [silver, setSilver] = useState(!!silverEligible);
  const [reason, setReason] = useState<DispositionReason | "">("");
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" role="dialog" aria-modal="true" aria-label="Confirm not moving forward" onClick={onCancel}>
      <div className={`${card} w-full max-w-md p-6`} onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-extrabold">Not moving forward with {name}?</h2>
        <p className="mt-2 text-sm text-muted-foreground">{jobTitle ? <>This closes {name} for <strong className="text-foreground">{jobTitle}</strong> only.</> : <>This closes {name} for this role only.</>} They'll get a kind update and can keep matching with your other openings.</p>
        {upcomingInterview && <p className="mt-4 flex items-start gap-2 rounded-xl bg-warning/15 p-3 text-sm"><CalendarX className="mt-0.5 h-4 w-4 shrink-0" /><span>{name} has an interview on <strong>{upcomingInterview}</strong>. It will be cancelled automatically so they aren't left waiting.</span></p>}
        <label className="mt-4 block text-sm font-semibold">Reason (private)<select className={`${inputCls} mt-1`} value={reason} onChange={(e) => setReason(e.target.value as DispositionReason)}><option value="">Choose a reason…</option>{DISPOSITION_REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        {silverEligible && <label className="mt-4 flex items-start gap-3 rounded-xl border border-border p-3 text-sm"><input type="checkbox" checked={silver} onChange={(e) => setSilver(e.target.checked)} className="mt-0.5" /><span><strong className="inline-flex items-center gap-1"><Medal className="h-4 w-4 text-primary" />Keep as Silver Medalist</strong><span className="block text-muted-foreground">Save this finalist to your Saved Candidates for future roles.</span></span></label>}
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onCancel} className={btn}>Keep in pipeline</button><button type="button" disabled={!reason} onClick={() => reason && onConfirm(silverEligible ? silver : false, reason)} className={primaryBtn}>Not Moving Forward</button></div>
      </div>
    </div>
  );
}
