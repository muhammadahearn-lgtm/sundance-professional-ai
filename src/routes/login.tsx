import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — Sundance Professional AI" },
      { name: "description", content: "Log in to your Sundance Professional AI candidate or recruiter account." },
      { property: "og:title", content: "Log in to Sundance Professional AI" },
      { property: "og:description", content: "Access your Sundance Professional AI dashboard." },
    ],
  }),
  component: Login,
});

function Login() {
  return (
    <section className="bg-gradient-hero py-20">
      <div className="container-x">
        <div className="mx-auto max-w-md rounded-3xl border border-border bg-card p-8 shadow-elevated">
          <h1 className="text-3xl font-extrabold">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">Log in to continue to Sundance Professional AI.</p>
          <form className="mt-8 space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" required /></div>
            <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" required /></div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2"><Checkbox id="remember" /> Remember me</label>
              <a href="#" className="font-medium text-primary hover:underline">Forgot password?</a>
            </div>
            <Button type="submit" size="lg" className="w-full rounded-full">Log in</Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            New to Sundance Professional AI? <Link to="/register" className="font-medium text-primary hover:underline">Create an account</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
