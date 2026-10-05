import type { ReactNode } from "react";
import { recommendationsFor, splitRecommended, type RecKind } from "@/lib/role-recommendations";

/** Renders picker options with a "Recommended For <Role>" group first when the role has a mapping and no search is typed. */
export function RecGroups<T extends { id: string; name: string }>({ items, roleName, kind, query, render, className }: {
  items: T[]; roleName?: string | null | undefined; kind: RecKind; query: string; render: (o: T) => ReactNode; className: string;
}) {
  const recNames = query.trim() ? [] : recommendationsFor(roleName, kind);
  const { rec, rest } = splitRecommended(items, recNames);
  if (!rec.length) return <div className={className}>{items.map(render)}</div>;
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-primary">Recommended For {roleName}</p>
        <div className="flex flex-wrap gap-1.5">{rec.map(render)}</div>
      </div>
      {rest.length > 0 && <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">All Available Options</p>
        <div className={className}>{rest.map(render)}</div>
      </div>}
    </div>
  );
}
