import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MessageSquare, Building2, CheckCircle2, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHero } from "@/components/site/shared";

export const Route = createFileRoute("/contact")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, 
      { title: "Contact Sundance Professionals — Talk to Our Team" },
      { name: "description", content: "Get in touch with Sundance Professionals about recruiting, enterprise plans or partnerships." },
      { property: "og:title", content: "Contact Sundance Professionals" },
      { property: "og:description", content: "Talk to our team about skill-first hiring." },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: Contact,
});

const SUPPORT_EMAIL = "support@sundanceprofessionals.com";

function Contact() {
  const [sent, setSent] = useState(false);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const subject = `[${get("topic") || "General"}] Message from ${get("name")}`;
    const body = `Name: ${get("name")}\nEmail: ${get("email")}\nCompany: ${get("company") || "-"}\nTopic: ${get("topic")}\n\n${get("message")}`;
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };
  return (
    <>
      <PageHero eyebrow="Contact" title="Let's talk hiring" desc="Questions about your account, recruiting, enterprise plans, or partnerships? We'd love to hear from you." />
      <section className="pb-24">
        <div className="container-x grid gap-8 lg:grid-cols-3">
          <div className="space-y-4">
            <a href={`mailto:${SUPPORT_EMAIL}`} className="flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft hover:border-primary">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft"><Mail className="h-5 w-5 text-primary" /></span>
              <div className="min-w-0"><div className="font-semibold">Email</div><div className="break-all text-sm text-muted-foreground">{SUPPORT_EMAIL}</div></div>
            </a>
            <Link to="/help" className="flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft hover:border-primary">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft"><LifeBuoy className="h-5 w-5 text-primary" /></span>
              <div><div className="font-semibold">Help Center</div><div className="text-sm text-muted-foreground">Quick answers to common questions</div></div>
            </Link>
            {[[Building2, "Enterprise", "Custom plans for talent teams"], [MessageSquare, "Support", "Replies within one business day"]].map(([I, t, d]) => {
              const Icon = I as typeof Mail;
              return (
                <div key={t as string} className="flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft"><Icon className="h-5 w-5 text-primary" /></span>
                  <div><div className="font-semibold">{t as string}</div><div className="text-sm text-muted-foreground">{d as string}</div></div>
                </div>
              );
            })}
          </div>
          <div className="rounded-3xl border border-border bg-card p-8 shadow-elevated lg:col-span-2">
            {sent ? (
              <div className="flex flex-col items-center py-16 text-center">
                <CheckCircle2 className="h-12 w-12 text-success" />
                <h2 className="mt-4 text-2xl font-bold">Your email app should open</h2>
                <p className="mt-2 max-w-md text-muted-foreground">Press send in your email app to reach us. If nothing opened, email us directly at <a className="text-primary underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
                <Button variant="outline" className="mt-6 rounded-full" onClick={() => setSent(false)}>Back to form</Button>
              </div>
            ) : (
              <form className="grid gap-5 sm:grid-cols-2" onSubmit={onSubmit}>
                <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" name="name" required maxLength={100} /></div>
                <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required maxLength={255} /></div>
                <div className="space-y-2"><Label htmlFor="company">Company</Label><Input id="company" name="company" maxLength={100} /></div>
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic</Label>
                  <select id="topic" name="topic" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option>Account help</option><option>Candidate question</option><option>Recruiter question</option><option>Report a problem</option><option>Enterprise / sales</option><option>Other</option>
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="message">Message</Label><Textarea id="message" name="message" rows={6} required maxLength={2000} /></div>
                <Button type="submit" size="lg" className="rounded-full sm:col-span-2 sm:justify-self-start">Send message</Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
