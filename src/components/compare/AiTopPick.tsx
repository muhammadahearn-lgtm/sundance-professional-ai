import type { ReactNode } from "react";
import { Crown, Sparkles, Trophy } from "lucide-react";
import { matchTier } from "@/lib/match-engine";

const TONE = { success: "text-success", primary: "text-primary", warning: "text-warning", muted: "text-muted-foreground" } as const;

/** Glowing "AI Top Pick" spotlight shown above a comparison table. */
export function AiTopPick({ title, subtitle, score, reasons, lead, media, context }: {
  title: string; subtitle?: string | undefined; score: number; reasons: string[]; lead: number | null; media?: ReactNode; context: string;
}) {
  const s = Math.round(score), tier = matchTier(s);
  return (
    <section aria-label="AI top pick" className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card p-5 shadow-elevated sm:p-6">
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-success/10 blur-3xl" />
      <div className="relative flex flex-wrap items-center gap-5">
        <div className="relative">
          <div className="grid h-24 w-24 place-items-center rounded-full bg-gradient-primary p-[3px] shadow-soft">
            <div className="grid h-full w-full place-items-center rounded-full bg-card">
              <div className="text-center"><p className={`font-display text-2xl font-extrabold leading-none ${TONE[tier.tone]}`}>{s}%</p><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Match</p></div>
            </div>
          </div>
          <span className="absolute -right-1 -top-1 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-soft"><Crown className="h-4 w-4" /></span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary"><Sparkles className="h-3.5 w-3.5" />AI Top Pick</p>
          <div className="mt-2 flex items-center gap-3">{media}<div className="min-w-0"><h2 className="truncate font-display text-xl font-extrabold">{title}</h2>{subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}</div></div>
          <p className="mt-2 text-sm"><span className={`font-semibold ${TONE[tier.tone]}`}>{tier.label}</span>{lead != null && lead > 0 && <span className="text-muted-foreground"> · leads the next option by {lead} pts</span>}<span className="text-muted-foreground"> · {context}</span></p>
        </div>
      </div>
      {reasons.length > 0 && (
        <ul className="relative mt-4 grid gap-2 sm:grid-cols-3">
          {reasons.slice(0, 3).map((r) => <li key={r} className="flex items-start gap-2 rounded-xl border border-border bg-background/60 px-3 py-2 text-sm backdrop-blur"><Trophy className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{r}</li>)}
        </ul>
      )}
    </section>
  );
}

/** Small rank pill for a comparison column header. */
export function RankPill({ rank, score }: { rank: number | undefined; score: number | null | undefined }) {
  if (score == null) return <span className="mt-2 inline-block rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">No score yet</span>;
  const s = Math.round(score), tier = matchTier(s);
  return (
    <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${rank === 1 ? "bg-gradient-primary text-primary-foreground shadow-soft" : "bg-muted"}`}>
      {rank === 1 && <Sparkles className="h-3 w-3" />}#{rank} · <span className={rank === 1 ? "" : TONE[tier.tone]}>{s}%</span>
    </span>
  );
}

export const BestTag = () => <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-success"><Trophy className="h-3 w-3" />Best</span>;
