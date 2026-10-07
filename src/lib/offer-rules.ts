/** Pure rules for job offers (validation, expiry, negotiation copy). */
export type OfferStatus = "pending" | "accepted" | "declined" | "withdrawn";
export type OfferForm = { salary: string; currency: string; bonus: string; equity: string; startDate: string; expiresOn: string; notes: string };

export const emptyOffer = (currency = "USD", salary: number | null = null): OfferForm => ({
  salary: salary ? String(salary) : "", currency, bonus: "", equity: "", startDate: "", expiresOn: "", notes: "",
});

const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(/[^\d]/g, "")));

/** Returns field errors; empty object means the offer can be sent. `today` is YYYY-MM-DD. */
export function validateOffer(f: OfferForm, today: string): Partial<Record<"salary" | "bonus" | "startDate" | "expiresOn" | "notes" | "equity", string>> {
  const e: Partial<Record<"salary" | "bonus" | "startDate" | "expiresOn" | "notes" | "equity", string>> = {};
  const s = num(f.salary);
  if (s === null || !Number.isFinite(s) || s <= 0) e.salary = "Enter the offered base salary.";
  else if (s > 100_000_000) e.salary = "That salary looks too large.";
  const b = num(f.bonus);
  if (b !== null && (!Number.isFinite(b) || b > 100_000_000)) e.bonus = "Enter a valid bonus.";
  if (f.startDate && f.startDate < today) e.startDate = "Start date can't be in the past.";
  if (f.expiresOn && f.expiresOn < today) e.expiresOn = "Deadline can't be in the past.";
  if (f.notes.length > 3000) e.notes = "Keep the note under 3000 characters.";
  if (f.equity.length > 500) e.equity = "Keep equity details under 500 characters.";
  return e;
}

export function toOfferRow(f: OfferForm) {
  return {
    salary_amount: num(f.salary), salary_currency: f.currency || "USD", signing_bonus: num(f.bonus),
    equity_details: f.equity.trim(), start_date: f.startDate || null, expires_on: f.expiresOn || null, notes: f.notes.trim(),
  };
}

/** An offer is expired when its deadline date is before today. */
export const offerExpired = (expiresOn: string | null, today: string) => !!expiresOn && expiresOn < today;

/** Whole days left until the deadline (0 = due today), or null without a deadline. */
export function daysLeft(expiresOn: string | null, today: string): number | null {
  if (!expiresOn) return null;
  return Math.round((Date.parse(expiresOn) - Date.parse(today)) / 864e5);
}

export const negotiateMessage = (jobTitle: string) =>
  `Hi, thank you so much for the offer for ${jobTitle}! I'm excited about the opportunity. Before finalizing, I'd love to discuss a couple of points about the offer. Let me know when you have a moment.`;

export const todayISO = () => new Date().toISOString().slice(0, 10);
