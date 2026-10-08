import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import { ThemeToggle } from "@/components/app/ThemeControls";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";

function useDashboardPath(userRole: unknown) {
  return userRole === "recruiter" ? "/recruiter/dashboard" : "/candidate/dashboard";
}

const nav = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/pricing", label: "Pricing" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { session } = useSession();
  const dash = useDashboardPath(session?.user.user_metadata?.['role']);
  const signOut = () => supabase.auth.signOut();
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container-x flex h-16 items-center justify-between">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: true }}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {session ? (<>
            <Button variant="ghost" size="sm" onClick={signOut}>Log out</Button>
            <Button asChild size="sm" className="rounded-full px-4"><Link to={dash}>Dashboard</Link></Button>
          </>) : (<>
            <Button asChild variant="ghost" size="sm"><Link to="/login">Login</Link></Button>
            <Button asChild size="sm" className="rounded-full px-4"><Link to="/register">Get Started</Link></Button>
          </>)}
        </div>
        <div className="flex items-center md:hidden"><ThemeToggle />
        <button className="p-2" aria-label="Toggle menu" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button></div>
      </div>
      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="container-x flex flex-col gap-1 py-4">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted">
                {n.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              {session ? (<>
                <Button variant="outline" onClick={() => { setOpen(false); signOut(); }}>Log out</Button>
                <Button asChild><Link to={dash} onClick={() => setOpen(false)}>Dashboard</Link></Button>
              </>) : (<>
                <Button asChild variant="outline"><Link to="/login" onClick={() => setOpen(false)}>Login</Link></Button>
                <Button asChild><Link to="/register" onClick={() => setOpen(false)}>Get Started</Link></Button>
              </>)}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
