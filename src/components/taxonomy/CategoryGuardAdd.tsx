import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Lightbulb, Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { addTaxonomyEntry, crossCategoryMatch, KIND_LABEL, newEntryName } from "@/lib/taxonomy-add";
import { closeMatch, resolveAlias } from "@/lib/taxonomy-aliases";
import { taxonomyKey } from "@/lib/taxonomy";
import { classifyTaxonomyTerm, type ClassifyResult } from "@/lib/taxonomy-classify.functions";

type Kind = "skill" | "technology";
type Opt = { id: string; name: string };

const HINT: Record<Kind, string> = {
  skill: "Skills are concepts you practice (Machine Learning, API Design). Libraries, frameworks and cloud services like JAX, Docker or AWS go under Tools & Technologies.",
  technology: "Tools are things you install, import or log into (JAX, Docker, AWS). Concepts like Machine Learning or API Design go under Technical Skills.",
};

const byKey = (name: string, list: Opt[]) => list.find((o) => taxonomyKey(o.name) === taxonomyKey(name)) ?? null;

/**
 * Guards skill/technology additions so the shared list stays clean:
 * aliases (XL → Excel) and typos route to existing entries, existing terms go to their real category,
 * and brand-new terms are checked for official spelling + relevance before the user confirms.
 */
export function CategoryGuardAdd({ q, kind, options, otherOptions, onAdd, disabled }: {
  q: string; kind: Kind; options: Opt[]; otherOptions: Opt[];
  onAdd: (kind: Kind, id: string, name: string) => Promise<void> | void; disabled?: boolean;
}) {
  const classify = useServerFn(classifyTaxonomyTerm);
  const other: Kind = kind === "skill" ? "technology" : "skill";
  const [busy, setBusy] = useState(false);
  const [suggest, setSuggest] = useState<(ClassifyResult & { term: string }) | null>(null);
  const [skipTypo, setSkipTypo] = useState(false);
  useEffect(() => { setSuggest(null); setSkipTypo(false); }, [q]);

  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't add. Please try again."); } setBusy(false); };

  const trimmed = q.trim();
  const alias = trimmed ? resolveAlias(trimmed) : null;
  const aliasSame = alias ? byKey(alias, options) : null;
  const aliasOther = alias && !aliasSame ? byKey(alias, otherOptions) : null;
  const sameExists = newEntryName(q, options) === null;
  const cross = aliasSame || aliasOther || sameExists || !trimmed ? null : crossCategoryMatch(q, otherOptions);
  const newName = aliasSame || aliasOther || cross ? null : newEntryName(q, options);
  const typo = newName && !skipTypo ? (() => {
    const s = closeMatch(q, options); if (s) return { opt: s, kind };
    const o = closeMatch(q, otherOptions); return o ? { opt: o, kind: other } : null;
  })() : null;

  // Route to an existing entry; for "Did you mean" in the other category we still save to that category.
  const pick = (target: Kind, o: Opt) => run(async () => { await onAdd(target, o.id, o.name); });

  const startNew = () => run(async () => {
    const r = await classify({ data: { name: alias ?? q } });
    const term = (r.canonicalName && !r.failed ? r.canonicalName : alias ?? newName ?? q).trim();
    // The official name might already exist — reuse it instead of creating a duplicate.
    const exSame = byKey(term, options); if (exSame) { await onAdd(kind, exSame.id, exSame.name); toast.success(`Matched existing “${exSame.name}”`); return; }
    const exOther = byKey(term, otherOptions); if (exOther) { await onAdd(other, exOther.id, exOther.name); return; }
    setSuggest({ ...r, term });
  });
  const confirm = (target: Kind) => run(async () => {
    const name = suggest?.term ?? q;
    const id = await addTaxonomyEntry(target, name);
    await onAdd(target, id, name);
    setSuggest(null);
  });

  const card = "rounded-xl border border-primary/30 bg-primary-soft/40 p-3 text-sm";
  const primaryBtn = "mt-2 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60";

  return (
    <div className="space-y-2">
      {!trimmed && <p className="flex gap-1.5 text-xs text-muted-foreground"><Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />{HINT[kind]}</p>}

      {aliasOther && (
        <div className={card}>
          <p><span className="font-semibold">“{trimmed}”</span> matches <span className="font-semibold">{aliasOther.name}</span> in <span className="font-semibold">{KIND_LABEL[other]}</span>.</p>
          <button type="button" disabled={busy || disabled} onClick={() => pick(other, aliasOther)} className={primaryBtn}><Plus className="h-3 w-3" />Add {aliasOther.name} to {KIND_LABEL[other]}</button>
        </div>
      )}

      {cross && (
        <div className={card}>
          <p><span className="font-semibold">“{cross.name}”</span> is listed under <span className="font-semibold">{KIND_LABEL[other]}</span>.</p>
          <button type="button" disabled={busy || disabled} onClick={() => pick(other, cross)} className={primaryBtn}><Plus className="h-3 w-3" />Add to {KIND_LABEL[other]}</button>
        </div>
      )}

      {typo && !suggest && (
        <div className={card}>
          <p>Did you mean <span className="font-semibold">{typo.opt.name}</span>{typo.kind !== kind && <> in <span className="font-semibold">{KIND_LABEL[typo.kind]}</span></>}?</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy || disabled} onClick={() => pick(typo.kind, typo.opt)} className={primaryBtn}><Plus className="h-3 w-3" />Yes, add {typo.opt.name}</button>
            <button type="button" onClick={() => setSkipTypo(true)} className="mt-2 rounded-full px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground">No, it's something else</button>
          </div>
        </div>
      )}

      {newName && !typo && !suggest && (
        <button type="button" onClick={startNew} disabled={busy || disabled}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-primary px-3 py-1 text-xs font-semibold text-primary hover:bg-primary-soft disabled:opacity-60">
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}{busy ? "Checking the official name…" : `Add “${alias ?? newName}”`}
        </button>
      )}

      {suggest && suggest.valid === false && !suggest.failed && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm" role="dialog" aria-label={`Can't add ${suggest.term}`}>
          <p className="flex items-center gap-1.5 font-semibold"><AlertTriangle className="h-4 w-4 text-warning" />We couldn't recognize “{trimmed}”</p>
          <p className="mt-1 text-muted-foreground">{suggest.reason} Only recognized technical skills and software tools can be added. Personal strengths belong under Soft Skills.</p>
          <button type="button" onClick={() => setSuggest(null)} className="mt-3 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary">OK</button>
        </div>
      )}

      {suggest && (suggest.valid !== false || suggest.failed) && (
        <div className="rounded-xl border border-border bg-card p-4 text-sm shadow-sm" role="dialog" aria-label={`Add ${suggest.term}`}>
          <p className="font-semibold">Add “{suggest.term}”</p>
          {taxonomyKey(suggest.term) !== taxonomyKey(trimmed) && <p className="mt-0.5 text-xs text-muted-foreground">Standard spelling for “{trimmed}”.</p>}
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
