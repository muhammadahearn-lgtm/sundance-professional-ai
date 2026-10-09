import { formatSalaryAmount } from "./salary";

export type OfferLetterInput = {
  offerId: string; candidateName: string; jobTitle: string; companyName: string;
  salaryAmount: number | null; currency: string; signingBonus: number | null; equity: string;
  startDate: string | null; notes: string; revision: number; respondedAt: string | null; status: string;
  signedName?: string | null; signedAt?: string | null;
};

/** Only accepted offers with a recorded decision time get an acceptance certificate. */
export const canDownloadOfferLetter = (o: { status: string; responded_at: string | null }) => o.status === "accepted" && !!o.responded_at;

const day = (iso: string | null) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) : "To be confirmed");

/** Ordered label/value rows printed on the confirmation; pure so it can be tested. */
export function offerLetterRows(i: OfferLetterInput): [string, string][] {
  const rows: [string, string][] = [
    ["Candidate", i.candidateName],
    ["Position", i.jobTitle],
    ["Company", i.companyName || "—"],
    ["Base salary", formatSalaryAmount(i.salaryAmount, i.currency) || "—"],
  ];
  if (i.signingBonus) rows.push(["Signing bonus", formatSalaryAmount(i.signingBonus, i.currency)]);
  if (i.equity.trim()) rows.push(["Equity", i.equity.trim()]);
  rows.push(["Start date", day(i.startDate)]);
  rows.push(["Offer revision", String(i.revision)]);
  rows.push(["Accepted on", i.respondedAt ? `${new Date(i.respondedAt).toUTCString().replace("GMT", "UTC")}` : "—"]);
  if (i.signedName) rows.push(["Signed by", i.signedName]);
  rows.push(["Confirmation ID", i.offerId.slice(0, 8).toUpperCase()]);
  return rows;
}

export const offerLetterFileName = (name: string, job: string) => `Offer-Confirmation-${`${name}-${job}`.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}.pdf`;
