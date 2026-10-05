/** Platform-wide salary standard: store whole-number amounts + ISO currency code, format only for display. */

export const CURRENCIES = ["USD", "CAD", "EUR", "GBP", "AUD", "SGD", "IDR"] as const;
export type Currency = (typeof CURRENCIES)[number];
export const DEFAULT_CURRENCY: Currency = "USD";

/** Accepts digits only ("60000"). Anything else ($, k, letters, separators) is rejected. */
export function parseSalaryInput(raw: string): { ok: true; value: number | null } | { ok: false; error: string } {
  const s = raw.trim();
  if (!s) return { ok: true, value: null };
  if (!/^\d+$/.test(s)) return { ok: false, error: "Numbers only — no symbols, letters, commas or “k” (e.g. 60000)." };
  const n = Number(s);
  if (!Number.isSafeInteger(n) || n > 1_000_000_000_000) return { ok: false, error: "Enter a realistic amount." };
  return { ok: true, value: n };
}

/** Strips anything that isn't a digit while typing. */
export const digitsOnly = (s: string) => s.replace(/\D/g, "");

function amount(n: number, cur: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: cur || DEFAULT_CURRENCY, currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(n);
  } catch {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
  }
}

/** "$60,000 USD" */
export function formatSalaryAmount(n: number | null | undefined, cur: string | null | undefined): string {
  if (n == null) return "";
  const c = cur || DEFAULT_CURRENCY;
  return `${amount(n, c)} ${c}`;
}

/** "$120,000 - $150,000 USD", "From $120,000 USD", "Up to $150,000 USD" */
export function formatSalaryRange(min: number | null | undefined, max: number | null | undefined, cur: string | null | undefined): string {
  const c = cur || DEFAULT_CURRENCY;
  if (min != null && max != null) return min === max ? formatSalaryAmount(min, c) : `${amount(min, c)} - ${amount(max, c)} ${c}`;
  if (min != null) return `From ${formatSalaryAmount(min, c)}`;
  if (max != null) return `Up to ${formatSalaryAmount(max, c)}`;
  return "";
}
