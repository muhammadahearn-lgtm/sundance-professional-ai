/** Pre-screening questions and equity rules. Display/eligibility only — never feeds match scores. */
export type QType = "yes_no" | "choice" | "text";
export type ScreeningQ = { id: string; text: string; type: QType; options: string[]; ideal: string; required: boolean };

export const MAX_QUESTIONS = 8;
export const QUESTION_MAX = 300;
export const ANSWER_MAX = 1000;

export const PRESETS: { key: string; label: string; q: Omit<ScreeningQ, "id"> }[] = [
  { key: "visa", label: "Visa sponsorship", q: { text: "Do you require visa sponsorship to work in this location?", type: "yes_no", options: [], ideal: "No", required: true } },
  { key: "arrangement", label: "Work arrangement", q: { text: "Are you comfortable with this role's remote / hybrid / on-site policy?", type: "yes_no", options: [], ideal: "Yes", required: true } },
  { key: "notice", label: "Start date", q: { text: "What is your availability to start?", type: "choice", options: ["Immediately", "2 weeks", "1 month", "2+ months"], ideal: "", required: true } },
];

export const newId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
export const fromPreset = (key: string): ScreeningQ | null => {
  const p = PRESETS.find((x) => x.key === key);
  return p ? { id: newId(), ...p.q, options: [...p.q.options] } : null;
};

export function optionsFor(q: Pick<ScreeningQ, "type" | "options">): string[] {
  return q.type === "yes_no" ? ["Yes", "No"] : q.type === "choice" ? q.options : [];
}

/** Returns an error message per question id. */
export function validateQuestions(qs: ScreeningQ[]): Record<string, string> {
  const e: Record<string, string> = {};
  for (const q of qs) {
    const t = q.text.trim();
    if (t.length < 3) e[q.id] = "Write the question (at least 3 characters).";
    else if (t.length > QUESTION_MAX) e[q.id] = `Keep it under ${QUESTION_MAX} characters.`;
    else if (q.type === "choice" && q.options.map((o) => o.trim()).filter(Boolean).length < 2) e[q.id] = "Add at least two answer options.";
  }
  return e;
}

/** Returns an error message per unanswered/invalid question id. */
export function validateAnswers(qs: ScreeningQ[], answers: Record<string, string>): Record<string, string> {
  const e: Record<string, string> = {};
  for (const q of qs) {
    const a = (answers[q.id] ?? "").trim();
    if (!a) { if (q.required) e[q.id] = "Please answer this question."; continue; }
    if (a.length > ANSWER_MAX) e[q.id] = `Keep it under ${ANSWER_MAX} characters.`;
    const opts = optionsFor(q);
    if (opts.length && !opts.includes(a)) e[q.id] = "Pick one of the options.";
  }
  return e;
}

/** "match" when the answer equals the recruiter's preferred answer, "mismatch" when it differs, null when no preference. */
export function answerFit(q: Pick<ScreeningQ, "ideal">, answer: string): "match" | "mismatch" | null {
  if (!q.ideal.trim() || !answer.trim()) return null;
  return q.ideal.trim().toLowerCase() === answer.trim().toLowerCase() ? "match" : "mismatch";
}

// ---------- Equity ----------
export type EquityType = "none" | "rsu" | "stock_options" | "percentage";
export const EQUITY_TYPES: { value: EquityType; label: string; hint: string }[] = [
  { value: "none", label: "No equity", hint: "Salary and bonus only" },
  { value: "rsu", label: "RSUs", hint: "Restricted stock units — public / late-stage" },
  { value: "stock_options", label: "Stock options", hint: "ISO / NSO — growth startups" },
  { value: "percentage", label: "Equity %", hint: "Ownership share — early-stage" },
];
export const equityLabel = (t: string) => EQUITY_TYPES.find((x) => x.value === t)?.label ?? "No equity";

/** Short candidate-facing summary, or "" when the job offers no equity. */
export function equitySummary(j: { equity_type?: string | null; equity_range?: string | null }): string {
  if (!j.equity_type || j.equity_type === "none") return "";
  const r = (j.equity_range ?? "").trim();
  return r ? `${equityLabel(j.equity_type)} · ${r}` : equityLabel(j.equity_type);
}

export function validateEquity(f: { equity_type: string; equity_range: string; equity_vesting: string }): Partial<Record<"equity_range" | "equity_vesting", string>> {
  const e: Partial<Record<"equity_range" | "equity_vesting", string>> = {};
  if (f.equity_type === "none") return e;
  if (f.equity_range.trim().length > 80) e.equity_range = "Keep the range under 80 characters.";
  if (f.equity_vesting.trim().length > 160) e.equity_vesting = "Keep vesting notes under 160 characters.";
  return e;
}
