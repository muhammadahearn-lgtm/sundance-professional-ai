import { card } from "@/components/profile/parts";
import { btn, primaryBtn } from "@/components/talent/Talent";

/** Gentle confirmation before closing a candidate for one role ("Not Moving Forward"). */
export function NotMovingForwardDialog({ name, jobTitle, onConfirm, onCancel }: { name: string; jobTitle?: string | null | undefined; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" role="dialog" aria-modal="true" aria-label="Confirm not moving forward" onClick={onCancel}>
      <div className={`${card} w-full max-w-md p-6`} onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-extrabold">Not moving forward with {name}?</h2>
        <p className="mt-2 text-sm text-muted-foreground">{jobTitle ? <>This closes {name} for <strong className="text-foreground">{jobTitle}</strong> only.</> : <>This closes {name} for this role only.</>} They'll get a kind update and can keep matching with your other openings.</p>
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onCancel} className={btn}>Keep in pipeline</button><button type="button" onClick={onConfirm} className={primaryBtn}>Not Moving Forward</button></div>
      </div>
    </div>
  );
}
