import { useState } from "react";
import { toast } from "sonner";
import { FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { namesFor } from "@/lib/talent-data";
import { canDownloadOfferLetter, offerLetterFileName } from "@/lib/offer-letter";
import type { Offer } from "@/lib/offers-data";

/** Download the Offer Summary & Acceptance Confirmation PDF for an accepted offer. */
export function OfferLetterButton({ offer, jobTitle, side, className }: { offer: Offer; jobTitle: string; side: "candidate" | "recruiter"; className?: string }) {
  const [busy, setBusy] = useState(false);
  if (!canDownloadOfferLetter(offer)) return null;
  async function go() {
    setBusy(true);
    try {
      const [{ buildOfferLetterPdf }, job] = await Promise.all([
        import("@/lib/offer-letter-pdf"),
        supabase.from("jobs").select("job_title, companies(company_name)").eq("job_id", offer.job_id).maybeSingle(),
      ]);
      let candidateName = "Candidate";
      if (side === "recruiter") candidateName = (await namesFor([offer.candidate_id]))[offer.candidate_id] ?? candidateName;
      else { const { data } = await supabase.from("profiles").select("first_name, last_name").eq("user_id", offer.candidate_id).maybeSingle(); if (data) candidateName = `${data.first_name} ${data.last_name}`.trim() || candidateName; }
      const title = job.data?.job_title || jobTitle;
      const bytes = await buildOfferLetterPdf({
        offerId: offer.offer_id, candidateName, jobTitle: title, companyName: (job.data?.companies as { company_name: string } | null)?.company_name ?? "",
        salaryAmount: offer.salary_amount, currency: offer.salary_currency, signingBonus: offer.signing_bonus, equity: offer.equity_details ?? "",
        startDate: offer.start_date, notes: offer.notes ?? "", revision: offer.revision, respondedAt: offer.responded_at, status: offer.status, signedName: offer.signed_name ?? null, signedAt: offer.signed_at ?? null,
      });
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
      const a = document.createElement("a"); a.href = url; a.download = offerLetterFileName(candidateName, title); a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't create the confirmation."); }
    finally { setBusy(false); }
  }
  return <button type="button" onClick={go} disabled={busy} className={className ?? "inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold hover:border-primary hover:text-primary disabled:opacity-50"}><FileDown className="h-4 w-4" />{busy ? "Preparing…" : "Download Offer Confirmation"}</button>;
}
