import { createFileRoute } from "@tanstack/react-router";
import { Target, Brain, Zap, Eye, Compass, Telescope } from "lucide-react";
import { PageHero, SectionHeading } from "@/components/site/shared";

export const Route = createFileRoute("/about")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, 
      { title: "About Sundance Professionals — Mission, Vision & Principles" },
      { name: "description", content: "Sundance Professionals transforms hiring from keyword matching into intelligent, skill-first talent discovery." },
      { property: "og:title", content: "About Sundance Professionals" },
      { property: "og:description", content: "Our mission, vision and the principles behind skill-first hiring." },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: About,
});

function About() {
  const principles = [
    [Target, "Skill-First Hiring", "We evaluate what professionals can do — skills, languages, tools and experience — not just titles."],
    [Brain, "Career Intelligence", "Every professional deserves clear guidance on readiness, skill gaps and next steps."],
    [Zap, "Recruiter Efficiency", "Less resume screening, more qualified conversations and faster hires."],
    [Eye, "Transparency", "Every match explains why — aligned skills, missing skills and readiness."],
  ] as const;
  return (
    <>
      <PageHero eyebrow="About us" title="Transforming hiring into intelligent talent discovery" desc="Sundance Professionals is an AI-powered hiring marketplace connecting technology professionals and recruiters through skill-based matching and career intelligence." />
      <section className="py-24">
        <div className="container-x grid gap-6 md:grid-cols-2">
          {[[Compass, "Mission", "To simplify job searching and talent acquisition through AI-powered candidate discovery, skill-based matching, and career intelligence."],
            [Telescope, "Vision", "To become the most trusted AI-powered hiring marketplace for technology professionals and recruiters."]].map(([I, t, d]) => {
            const Icon = I as typeof Compass;
            return (
              <div key={t as string} className="rounded-3xl border border-border bg-card p-10 shadow-soft">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground"><Icon className="h-6 w-6" /></span>
                <h2 className="mt-6 text-2xl font-extrabold">{t as string}</h2>
                <p className="mt-3 text-lg text-muted-foreground">{d as string}</p>
              </div>
            );
          })}
        </div>
      </section>
      <section className="bg-secondary py-24">
        <div className="container-x">
          <SectionHeading eyebrow="Core principles" title="What we believe" />
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {principles.map(([I, t, d]) => (
              <div key={t} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                <I className="h-6 w-6 text-primary" />
                <h3 className="mt-4 font-bold">{t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-24">
        <div className="container-x">
          <SectionHeading eyebrow="Marketplace overview" title="One marketplace, three promises" />
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[["For Candidates", "Find the right opportunity faster through intelligent job matching."],
              ["For Recruiters", "Find the right talent faster through intelligent candidate discovery."],
              ["For Sundance Professionals", "Transform hiring from keyword matching into intelligent talent discovery."]].map(([t, d], i) => (
              <div key={t} className={`rounded-3xl p-8 ${i === 2 ? "bg-ink text-ink-foreground" : "border border-border bg-card shadow-soft"}`}>
                <div className="font-display text-sm font-bold text-primary">0{i + 1}</div>
                <h3 className="mt-3 text-xl font-bold">{t}</h3>
                <p className={`mt-2 ${i === 2 ? "text-ink-foreground/70" : "text-muted-foreground"}`}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
