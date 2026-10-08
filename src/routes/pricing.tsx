import { createFileRoute } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";
import { PageHero, PricingCards } from "@/components/site/shared";

export const Route = createFileRoute("/pricing")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
      { title: "Pricing — Free Early Access | Sundance Professionals" },
      { name: "description", content: "Sundance Professionals is free for every candidate and recruiter during early access. No credit card required." },
      { property: "og:title", content: "Sundance Professionals Pricing — Free Early Access" },
      { property: "og:description", content: "Every feature is free for candidates and recruiters during early access." },
    ],
    links: [{ rel: "canonical", href: "/pricing" }],
  }),
  component: Pricing,
});

const rows: [string, boolean, boolean][] = [
  ["Skill-first talent profile", true, false],
  ["Job search with match scores", true, false],
  ["Save & compare jobs", true, false],
  ["Application tracking & timeline", true, false],
  ["Career intelligence", true, false],
  ["Company page & job wizard", false, true],
  ["Talent search with match scores", false, true],
  ["Compare candidates & AI Top Pick", false, true],
  ["Kanban hiring pipeline", false, true],
  ["Interview scheduling & calendar links", true, true],
  ["In-app messaging", true, true],
  ["Analytics", true, true],
  ["Notifications", true, true],
];

function Pricing() {
  return (
    <>
      <PageHero eyebrow="Free early access" title="Free for everyone, for now" desc="Every feature is free for candidates and recruiters while we test with our early community. No credit card required." />
      <section className="-mt-8 pb-20"><div className="container-x"><PricingCards /></div></section>
      <section className="pb-24">
        <div className="container-x">
          <h2 className="text-center text-3xl font-extrabold">What's included</h2>
          <div className="mx-auto mt-10 max-w-4xl overflow-x-auto rounded-3xl border border-border bg-card shadow-soft">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-secondary">
                <tr>{["Feature", "Candidate", "Recruiter"].map((h) => <th key={h} className="px-6 py-4 text-left font-semibold">{h}</th>)}</tr>
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
          <p className="mt-6 text-center text-sm text-muted-foreground">Paid plans may be introduced later. We'll let you know well in advance.</p>
        </div>
      </section>
    </>
  );
}
