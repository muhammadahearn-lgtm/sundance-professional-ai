import type { MatchDetails } from "./match-engine";

/** One-sentence plain-language explanation of a match. Display only; never changes scores. */
export function matchSummary(score: number, d: MatchDetails): string {
  const req = d.missing.requiredMissing;
  const gaps = [...d.missing.languages, ...d.missing.skills, ...d.missing.technologies];
  const level = score >= 90 ? "Excellent match" : score >= 75 ? "Strong match" : score >= 60 ? "Moderate match" : "Weak match";
  const good: string[] = [];
  if (!req.length) good.push("you cover every required item");
  if (d.experienceGap === 0) good.push("you meet the experience requirement");
  const why = good.length ? ` because ${good.join(" and ")}` : "";
  const improve = req.length
    ? ` Add ${list(req.slice(0, 3))} to improve.`
    : gaps.length ? ` Adding ${list(gaps.slice(0, 2))} would raise it further.` : "";
  return `${level}${why}.${improve}`;
}

/** Prioritized next steps: required gaps first, then experience, then other gaps. Max 4. */
export function nextSteps(d: MatchDetails): string[] {
  const req = new Set(d.missing.requiredMissing);
  const other = [...d.missing.languages, ...d.missing.skills, ...d.missing.technologies].filter((x) => !req.has(x));
  const out = [...req].map((x) => `Add ${x} to your profile if you have experience with it — it's required.`);
  if (d.experienceGap > 0) out.push(`This role asks for ${d.experienceGap} more year${d.experienceGap === 1 ? "" : "s"} of experience than your profile lists.`);
  out.push(...other.map((x) => `Consider learning ${x} — it's listed as a plus.`));
  return out.slice(0, 4);
}

const list = (xs: string[]) => xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
