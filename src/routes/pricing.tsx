import { createFileRoute } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";
import { PageHero, PricingCards } from "@/components/site/shared";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Sundance Professional AI" },
      { name: "description", content: "Free for candidates. Recruiter Professional at $99/month. Enterprise plans for talent teams." },
      { property: "og:title", content: "Sundance Professional AI Pricing" },
      { property: "og:description", content: "Compare Candidate, Recruiter Professional and Enterprise plans." },
    ],
    links: [{ rel: "canonical", href: "/pricing" }],
  }),
  component: Pricing,
});

const rows: [string, boolean, boolean, boolean][] = [
  ["Talent Profile", true, false, false],
  ["Job Search", true, false, false],
  ["Match Scores", true, true, true],
  ["Career Intelligence", true, false, false],
  ["Job Posting", false, true, true],
  ["Candidate Search", false, true, true],
  ["Recruiting Pipeline", false, true, true],
  ["Messaging", false, true, true],
  ["Advanced Analytics", false, false, true],
  ["Team Management", false, false, true],
  ["Enterprise Support", false, false, true],
];

function Pricing() {
  return (
    <>
      <PageHero eyebrow="Pricing" title="Plans for every side of hiring" desc="Candidates are always free. Recruiters get the tools to hire faster." />
      <section className="-mt-8 pb-20"><div className="container-x"><PricingCards /></div></section>
      <section className="pb-24">
        <div className="container-x">
          <h2 className="text-center text-3xl font-extrabold">Compare plans</h2>
          <div className="mt-10 overflow-x-auto rounded-3xl border border-border bg-card shadow-soft">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-secondary">
                <tr>{["Feature", "Candidate", "Recruiter Professional", "Enterprise"].map((h) => <th key={h} className="px-6 py-4 text-left font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map(([f, ...v]) => (
                  <tr key={f} className="border-t border-border">
                    <td className="px-6 py-4 font-medium">{f}</td>
                    {v.map((x, i) => <td key={i} className="px-6 py-4">{x ? <Check className="h-4 w-4 text-primary" /> : <Minus className="h-4 w-4 text-muted-foreground/50" />}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
