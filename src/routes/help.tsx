import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, UserRound, Briefcase, ShieldCheck, LifeBuoy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PageHero } from "@/components/site/shared";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help Center & FAQ — Sundance Professionals" },
      { name: "description", content: "Answers for candidates and recruiters: profiles, match scores, applications, job posting, privacy and account help." },
      { property: "og:title", content: "Sundance Professionals Help Center" },
      { property: "og:description", content: "Find answers about profiles, match scores, jobs, messaging and your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/help" }],
  }),
  component: HelpPage,
});

type Faq = { q: string; a: string };
const SECTIONS: { id: string; title: string; icon: typeof Search; faqs: Faq[] }[] = [
  {
    id: "candidates", title: "For Candidates", icon: UserRound, faqs: [
      { q: "Is Sundance Professionals free for candidates?", a: "Yes. Creating a profile, searching jobs, seeing match scores, applying and using career insights are free for candidates." },
      { q: "How is my match score calculated?", a: "Scores compare your profile with a job on five areas: programming languages (20%), technical skills (30%), tools & technologies (20%), experience (20%) and preferences such as work arrangement, location, role, availability and salary (10%). Education, soft skills, certifications, photos, projects and links are shown to recruiters but never change the score." },
      { q: "How do I raise my match scores?", a: "Open a job and click its score to see “Why This Matches” and “Areas To Improve”. Adding missing skills, tools and accurate experience to your profile usually helps most." },
      { q: "Who can see my profile?", a: "Recruiters can see your profile if you turn on being searchable, or when you apply to one of their jobs. Your personal email is never shown to other users." },
      { q: "How do I track my applications?", a: "Go to Applications in your dashboard. Each application shows its current status and a timeline of updates from the recruiter." },
    ],
  },
  {
    id: "recruiters", title: "For Recruiters", icon: Briefcase, faqs: [
      { q: "How do I post a job?", a: "Go to Jobs → Create Job. Your progress saves automatically as a draft, and you can publish from the final review step." },
      { q: "Why don't I see match scores in talent search?", a: "Scores appear only after you pick one of your jobs at the top of talent search, so every score is measured against a real role." },
      { q: "How does the pipeline work?", a: "Each job has a pipeline board. Moving a candidate to a new stage also updates the status the candidate sees on their application." },
      { q: "Can I edit a closed job?", a: "Closed jobs are read-only to keep history accurate. Duplicate the job to reuse it. Jobs that have applications can't be deleted." },
      { q: "How do I set up my company page?", a: "Open Company in your dashboard to add your logo, banner, description and an optional public contact email." },
    ],
  },
  {
    id: "account", title: "Account, Privacy & Safety", icon: ShieldCheck, faqs: [
      { q: "I forgot my password.", a: "Use “Forgot password” on the login page and we'll email you a reset link. Signed-in users can change their password in Settings." },
      { q: "How do I contact another user?", a: "Use in-app messaging. Personal emails stay private for both candidates and recruiters." },
      { q: "How do I report a problem user or job?", a: "Use the Report button on a profile, job or message. Our team reviews every report privately." },
      { q: "How do I delete my account?", a: "Go to Settings → Delete account. This removes your profile, files and conversations and can't be undone." },
      { q: "How do I manage notifications?", a: "Go to Settings to choose which notification types you receive." },
    ],
  },
];

function HelpPage() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.map((s) => ({ ...s, faqs: s.faqs.filter((f) => (f.q + " " + f.a).toLowerCase().includes(q)) })).filter((s) => s.faqs.length);
  }, [query]);

  return (
    <>
      <PageHero eyebrow="Help Center" title="How can we help?" desc="Answers for candidates and recruiters using Sundance Professionals." />
      <section className="pb-24">
        <div className="container-x max-w-4xl">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search questions…" aria-label="Search help articles" className="h-12 rounded-full pl-12" />
          </div>
          <nav aria-label="Help topics" className="mt-6 flex flex-wrap gap-2">
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary">{s.title}</a>
            ))}
          </nav>

          <div className="mt-10 space-y-10">
            {filtered.length === 0 && <p className="text-center text-muted-foreground">No answers match “{query}”. Try other words or contact us below.</p>}
            {filtered.map((s) => (
              <div key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="flex items-center gap-3 text-2xl font-bold">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft"><s.icon className="h-5 w-5 text-primary" /></span>
                  {s.title}
                </h2>
                <Accordion type="multiple" className="mt-4 rounded-2xl border border-border bg-card px-5 shadow-soft">
                  {s.faqs.map((f) => (
                    <AccordionItem key={f.q} value={f.q}>
                      <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>

          <div className="mt-14 flex flex-col items-center gap-4 rounded-3xl border border-border bg-card p-8 text-center shadow-elevated">
            <LifeBuoy className="h-10 w-10 text-primary" />
            <h2 className="text-2xl font-bold">Still need help?</h2>
            <p className="text-muted-foreground">Our team replies within one business day.</p>
            <Button asChild className="rounded-full"><Link to="/contact">Contact support</Link></Button>
          </div>
        </div>
      </section>
    </>
  );
}
