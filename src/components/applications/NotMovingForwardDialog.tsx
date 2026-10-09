import { useState } from "react";
import { Medal } from "lucide-react";
import { card } from "@/components/profile/parts";
import { btn, primaryBtn } from "@/components/talent/Talent";

/** Gentle confirmation before closing a candidate for one role ("Not Moving Forward"). Late-stage finalists can be kept as Silver Medalists. */
export function NotMovingForwardDialog({ name, jobTitle, silverEligible, onConfirm, onCancel }: { name: string; jobTitle?: string | null | undefined; silverEligible?: boolean; onConfirm: (silver: boolean) => void; onCancel: () => void }) {
  const [silver, setSilver] = useState(!!silverEligible);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" role="dialog" aria-modal="true" aria-label="Confirm not moving forward" onClick={onCancel}>
      <div className={`${card} w-full max-w-md p-6`} onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-extrabold">Not moving forward with {name}?</h2>
        <p className="mt-2 text-sm text-muted-foreground">{jobTitle ? <>This closes {name} for <strong className="text-foreground">{jobTitle}</strong> only.</> : <>This closes {name} for this role only.</>} They'll get a kind update and can keep matching with your other openings.</p>
        {silverEligible && <label className="mt-4 flex items-start gap-3 rounded-xl border border-border p-3 text-sm"><input type="checkbox" checked={silver} onChange={(e) => setSilver(e.target.checked)} className="mt-0.5" /><span><strong className="inline-flex items-center gap-1"><Medal className="h-4 w-4 text-primary" />Keep as Silver Medalist</strong><span className="block text-muted-foreground">Save this finalist to your Saved Candidates for future roles.</span></span></label>}
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onCancel} className={btn}>Keep in pipeline</button><button type="button" onClick={() => onConfirm(silverEligible ? silver : false)} className={primaryBtn}>Not Moving Forward</button></div>
      </div>
    </div>
  );
}
