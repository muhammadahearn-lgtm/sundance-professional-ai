import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthCard } from "@/components/auth/AuthCard";

export const Route = createFileRoute("/unauthorized")({
  head: () => ({
    meta: [
      { title: "Access Denied — Sundance Professional AI" },
      { name: "description", content: "You don't have access to this area of Sundance Professional AI." },
      { property: "og:title", content: "Access denied" },
      { property: "og:description", content: "This page isn't available for your account type." },
    ],
  }),
  component: () => (
    <AuthCard>
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive"><ShieldX className="h-7 w-7" /></span>
        <h1 className="mt-5 text-2xl font-extrabold">Unauthorized Access</h1>
        <p className="mt-2 text-sm text-muted-foreground">This area isn't available for your account type.</p>
        <Button asChild className="mt-6 rounded-full"><Link to="/">Back to home</Link></Button>
      </div>
    </AuthCard>
  ),
});
