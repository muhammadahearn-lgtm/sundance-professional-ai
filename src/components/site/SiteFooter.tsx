import { Link } from "@tanstack/react-router";
import { Linkedin, Twitter, Facebook } from "lucide-react";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary">
      <div className="container-x grid gap-10 py-14 md:grid-cols-5">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            AI-powered skill-first hiring and career intelligence for technology professionals and recruiters.
          </p>
          <div className="mt-5 flex gap-2">
            {[{ I: Linkedin, l: "LinkedIn" }, { I: Twitter, l: "X" }, { I: Facebook, l: "Facebook" }].map(({ I, l }) => (
              <a key={l} href="#" aria-label={l} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:text-primary">
                <I className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        <FooterCol title="Company" links={[["About", "/about"], ["Contact", "/contact"], ["Careers", "/contact"]]} />
        <FooterCol title="Platform" links={[["Jobs", "/register"], ["Talent Search", "/register"], ["Pricing", "/pricing"]]} />
        <FooterCol title="Legal" links={[["Privacy Policy", "/about"], ["Terms Of Service", "/about"]]} />
      </div>
      <div className="border-t border-border">
        <div className="container-x py-6 text-sm text-muted-foreground">© {new Date().getFullYear()} Sundance Professionals. All rights reserved.</div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, "/about" | "/contact" | "/register" | "/pricing"][] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="mt-4 space-y-2.5">
        {links.map(([l, to]) => (
          <li key={l}><Link to={to} className="text-sm text-muted-foreground hover:text-foreground">{l}</Link></li>
        ))}
      </ul>
    </div>
  );
}
