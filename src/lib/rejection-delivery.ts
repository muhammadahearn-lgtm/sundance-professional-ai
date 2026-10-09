import { supabase } from "@/integrations/supabase/client";

export const REJECTION_TIMINGS = [
  ["24h", "In 24 hours", "Gives you time to change your mind"],
  ["morning", "Tomorrow at 9:00 AM", "Arrives at the start of a business day"],
  ["now", "Right away", "Send the update immediately"],
] as const;
export type RejectionTiming = (typeof REJECTION_TIMINGS)[number][0];
export const DEFAULT_REJECTION_TIMING: RejectionTiming = "24h";

/** When the candidate's notice should go out; null means immediately. Uses the recruiter's local clock. */
export function rejectionDeliverAt(timing: RejectionTiming, now: Date = new Date()): Date | null {
  if (timing === "now") return null;
  if (timing === "24h") return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

/** A notice is still pending (cancellable) while its time hasn't come and it hasn't been sent. */
export function isRejectionPending(deliverAt: string | null | undefined, notifiedAt: string | null | undefined, now: Date = new Date()): boolean {
  return !!deliverAt && !notifiedAt && new Date(deliverAt).getTime() > now.getTime();
}

/** Store the schedule before the status change so the candidate is not notified right away. */
export async function scheduleRejection(applicationId: string, timing: RejectionTiming, prevStage: string | null) {
  const at = rejectionDeliverAt(timing);
  const { error } = await supabase.from("applications").update({ rejection_deliver_at: at?.toISOString() ?? null, rejection_prev_stage: at ? prevStage : null, rejection_notified_at: null }).eq("application_id", applicationId);
  if (error) throw error;
}

/** Send a scheduled notice now: the hourly delivery picks it up on its next run. */
export async function sendRejectionNow(applicationId: string) {
  const { error } = await supabase.from("applications").update({ rejection_deliver_at: new Date().toISOString() }).eq("application_id", applicationId);
  if (error) throw error;
}
