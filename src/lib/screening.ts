/** Pre-screening questions and equity rules. Display/eligibility only — never feeds match scores. */
export type QType = "yes_no" | "choice" | "text";
export type ScreeningQ = { id: string; text: string; type: QType; options: string[]; ideal: string; required: boolean; knockout?: boolean };

export const MAX_QUESTIONS = 8;
export const QUESTION_MAX = 300;
export const ANSWER_MAX = 1000;

export type PresetGroup = "logistics" | "experience" | "fit";
export const PRESET_GROUPS: { key: PresetGroup; label: string }[] = [
  { key: "logistics", label: "Logistics" },
  { key: "experience", label: "Experience" },
  { key: "fit", label: "Pay & Communication" },
];
const yn = (text: string, ideal: string, required = true, knockout = false): Omit<ScreeningQ, "id"> => ({ text, type: "yes_no", options: [], ideal, required, knockout });

export const PRESETS: { key: string; group: PresetGroup; label: string; q: Omit<ScreeningQ, "id"> }[] = [
  { key: "visa", group: "logistics", label: "Visa sponsorship", q: yn("Do you require visa sponsorship now or in the future to work in this location?", "No", true, true) },
  { key: "authorization", group: "logistics", label: "Work authorization", q: yn("Are you legally authorized to work in this role's location?", "Yes", true, true) },
  { key: "arrangement", group: "logistics", label: "Work arrangement", q: yn("Are you comfortable with this role's remote / hybrid / on-site policy?", "Yes") },
  { key: "notice", group: "logistics", label: "Start date", q: { text: "What is your availability to start?", type: "choice", options: ["Immediately", "2 weeks", "1 month", "2+ months"], ideal: "", required: true } },
  { key: "timezone", group: "logistics", label: "Timezone overlap", q: yn("Can you work at least 4 hours a day overlapping with our core timezone?", "Yes") },
  { key: "years", group: "experience", label: "Years of experience", q: { text: "How many years of professional experience do you have in this role's core area?", type: "choice", options: ["1–2 years", "3–5 years", "6–8 years", "8+ years"], ideal: "", required: true } },
  { key: "portfolio", group: "experience", label: "Portfolio / GitHub", q: { text: "Share a link to your GitHub, portfolio, or recent work.", type: "text", options: [], ideal: "", required: false } },
  { key: "scale", group: "experience", label: "Production systems", q: yn("Have you built and operated production systems at scale?", "Yes", false) },
  { key: "leadership", group: "experience", label: "Mentoring / leadership", q: yn("Have you mentored teammates or led technical initiatives?", "Yes", false) },
  { key: "salary", group: "fit", label: "Salary alignment", q: yn("Does the posted salary range meet your expectations?", "Yes") },
  { key: "english", group: "fit", label: "Business English", q: yn("Are you comfortable communicating daily in professional English, written and spoken?", "Yes") },
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
    else if (q.knockout && (q.type === "text" || !q.ideal.trim())) e[q.id] = "Dealbreakers need a preferred answer.";
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

/** Dealbreaker questions the candidate answered differently from the preferred answer. Flags only — never auto-rejects. */
export function knockoutMisses(items: { q: ScreeningQ; answer: string }[]): ScreeningQ[] {
  return items.filter(({ q, answer }) => q.knockout && answerFit(q, answer) === "mismatch").map((x) => x.q);
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
