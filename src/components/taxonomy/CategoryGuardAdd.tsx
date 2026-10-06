import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Lightbulb, Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { addTaxonomyEntry, crossCategoryMatch, KIND_LABEL, newEntryName } from "@/lib/taxonomy-add";
import { classifyTaxonomyTerm, type ClassifyResult } from "@/lib/taxonomy-classify.functions";

type Kind = "skill" | "technology";
type Opt = { id: string; name: string };

const HINT: Record<Kind, string> = {
  skill: "Skills are concepts you practice (Machine Learning, API Design). Libraries, frameworks and cloud services like JAX, Docker or AWS go under Tools & Technologies.",
  technology: "Tools are things you install, import or log into (JAX, Docker, AWS). Concepts like Machine Learning or API Design go under Technical Skills.",
};

/**
 * Guards skill/technology additions: existing terms are routed to their real category,
 * brand-new terms get an AI-suggested category the user confirms before it is created.
 */
export function CategoryGuardAdd({ q, kind, options, otherOptions, onAdd, disabled }: {
  q: string; kind: Kind; options: Opt[]; otherOptions: Opt[];
  onAdd: (kind: Kind, id: string, name: string) => Promise<void> | void; disabled?: boolean;
}) {
  const classify = useServerFn(classifyTaxonomyTerm);
  const other: Kind = kind === "skill" ? "technology" : "skill";
  const [busy, setBusy] = useState(false);
  const [suggest, setSuggest] = useState<(ClassifyResult & { term: string }) | null>(null);
  useEffect(() => { setSuggest(null); }, [q]);

  const sameExists = newEntryName(q, options) === null;
  const cross = !sameExists || !q.trim() ? null : crossCategoryMatch(q, otherOptions);
  const newName = cross ? null : newEntryName(q, options);

  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't add. Please try again."); } setBusy(false); };

  const startNew = () => run(async () => {
    const r = await classify({ data: { name: q } });
    setSuggest({ ...r, term: newName ?? q });
  });
  const confirm = (target: Kind) => run(async () => {
    const id = await addTaxonomyEntry(target, q);
    await onAdd(target, id, suggest?.term ?? q);
    setSuggest(null);
  });

  return (
    <div className="space-y-2">
      {!q.trim() && <p className="flex gap-1.5 text-xs text-muted-foreground"><Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />{HINT[kind]}</p>}

      {cross && (
        <div className="rounded-xl border border-primary/30 bg-primary-soft/40 p-3 text-sm">
          <p><span className="font-semibold">“{cross.name}”</span> is listed under <span className="font-semibold">{KIND_LABEL[other]}</span>.</p>
          <button type="button" disabled={busy || disabled} onClick={() => run(async () => { await onAdd(other, cross.id, cross.name); })}
            className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
            <Plus className="h-3 w-3" />Add to {KIND_LABEL[other]}
          </button>
        </div>
      )}

      {newName && !suggest && (
        <button type="button" onClick={startNew} disabled={busy || disabled}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-primary px-3 py-1 text-xs font-semibold text-primary hover:bg-primary-soft disabled:opacity-60">
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}{busy ? "Checking where it belongs…" : `Add “${newName}”`}
        </button>
      )}

      {suggest && (
        <div className="rounded-xl border border-border bg-card p-4 text-sm shadow-sm" role="dialog" aria-label={`Add ${suggest.term}`}>
          <p className="font-semibold">Add “{suggest.term}”</p>
          {suggest.failed ? (
            <p className="mt-1 text-muted-foreground">Where does this belong?</p>
          ) : (
            <p className="mt-1 flex gap-1.5 text-muted-foreground"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{suggest.reason} Suggested: <span className="font-semibold text-foreground">{KIND_LABEL[suggest.category]}</span>.</span></p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {(["technology", "skill"] as Kind[]).sort((a) => (!suggest.failed && a === suggest.category ? -1 : 1)).map((k) => {
              const rec = !suggest.failed && k === suggest.category;
              return (
                <button key={k} type="button" disabled={busy || disabled} onClick={() => confirm(k)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${rec ? "bg-primary text-primary-foreground hover:opacity-90" : "border border-border hover:border-primary hover:text-primary"}`}>
                  {rec ? "Confirm: " : "Add to "}{KIND_LABEL[k]}
                </button>
              );
            })}
            <button type="button" onClick={() => setSuggest(null)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
