import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MessageSquare, Building2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHero } from "@/components/site/shared";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Sundance AI — Talk to Our Team" },
      { name: "description", content: "Get in touch with Sundance AI about recruiting, enterprise plans or partnerships." },
      { property: "og:title", content: "Contact Sundance AI" },
      { property: "og:description", content: "Talk to our team about skill-first hiring." },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: Contact,
});

function Contact() {
  const [sent, setSent] = useState(false);
  return (
    <>
      <PageHero eyebrow="Contact" title="Let's talk hiring" desc="Questions about recruiting, enterprise plans, or partnerships? We'd love to hear from you." />
      <section className="pb-24">
        <div className="container-x grid gap-8 lg:grid-cols-3">
          <div className="space-y-4">
            {[[Mail, "Email", "hello@sundance.ai"], [Building2, "Enterprise", "Custom plans for talent teams"], [MessageSquare, "Support", "Replies within one business day"]].map(([I, t, d]) => {
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
                <h2 className="mt-4 text-2xl font-bold">Message sent</h2>
                <p className="mt-2 text-muted-foreground">Thanks — our team will be in touch shortly.</p>
              </div>
            ) : (
              <form className="grid gap-5 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
                <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" required maxLength={100} /></div>
                <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" required maxLength={255} /></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="company">Company</Label><Input id="company" maxLength={100} /></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="message">Message</Label><Textarea id="message" rows={6} required maxLength={2000} /></div>
                <Button type="submit" size="lg" className="rounded-full sm:col-span-2 sm:justify-self-start">Send message</Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
