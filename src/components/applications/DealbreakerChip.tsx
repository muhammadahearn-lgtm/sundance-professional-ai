/** Warning chip for applicants who missed knockout questions. Flag only — never blocks a move. */
export function DealbreakerChip({ count }: { count?: number }) {
  if (!count) return null;
  return <span title="Answered a dealbreaker question differently from your preferred answer. Open the application to review." className="mt-1 inline-block rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">⚠ {count > 1 ? `${count} dealbreakers` : "Dealbreaker"}</span>;
}
