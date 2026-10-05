import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { PageHero } from "@/components/site/shared";

export const LEGAL_UPDATED = "October 5, 2026";
export const LEGAL_CONTACT = "muhammad@sundanceprofessionals.com";

export type LegalSection = { id: string; title: string; body: ReactNode };

export function LegalPage({ eyebrow, title, desc, sections }: { eyebrow: string; title: string; desc: string; sections: LegalSection[] }) {
  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} desc={desc} />
      <section className="py-16">
        <div className="container-x grid gap-10 lg:grid-cols-[240px_1fr]">
          <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">On this page</p>
            <ol className="mt-3 space-y-2 text-sm">
              {sections.map((s, i) => (
                <li key={s.id}><a href={`#${s.id}`} className="text-muted-foreground hover:text-foreground">{i + 1}. {s.title}</a></li>
              ))}
            </ol>
            <div className="mt-6 flex flex-col gap-1 border-t border-border pt-4 text-sm">
              <Link to="/privacy" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "font-semibold text-foreground" }}>Privacy Policy</Link>
              <Link to="/terms" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "font-semibold text-foreground" }}>Terms Of Service</Link>
              <Link to="/community-guidelines" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "font-semibold text-foreground" }}>Community Guidelines</Link>
            </div>
          </nav>
          <article className="min-w-0 max-w-3xl">
            <p className="rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground">Last updated: {LEGAL_UPDATED}. Sundance Professionals is in early access; these terms may be updated before full launch.</p>
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-24 border-b border-border py-8 last:border-0">
                <h2 className="text-xl font-bold">{i + 1}. {s.title}</h2>
                <div className="mt-3 space-y-3 leading-relaxed text-muted-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground">{s.body}</div>
              </section>
            ))}
          </article>
        </div>
      </section>
    </>
  );
}

export function Mail() {
  return <a href={`mailto:${LEGAL_CONTACT}`} className="font-medium text-primary hover:underline">{LEGAL_CONTACT}</a>;
}

export function legalHead(title: string, description: string, path: string) {
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: path }],
  };
}
