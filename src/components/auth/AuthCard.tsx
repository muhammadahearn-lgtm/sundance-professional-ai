import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export function AuthCard({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <section className="bg-gradient-hero py-16 sm:py-20">
      <div className="container-x">
        <div className={`mx-auto ${wide ? "max-w-3xl" : "max-w-md"} rounded-3xl border border-border bg-card p-6 shadow-elevated sm:p-8`}>
          {children}
        </div>
      </div>
    </section>
  );
}

export function FormAlert({ kind = "error", children }: { kind?: "error" | "success"; children: ReactNode }) {
  const err = kind === "error";
  return (
    <div role={err ? "alert" : "status"} className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${err ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-success/30 bg-success/10 text-success"}`}>
      {err ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
      <div>{children}</div>
    </div>
  );
}

export function SuccessScreen({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
        <CheckCircle2 className="h-7 w-7" />
      </span>
      <h1 className="mt-5 text-2xl font-extrabold sm:text-3xl">{title}</h1>
      <div className="mt-2 text-sm text-muted-foreground">{children}</div>
      {actions && <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">{actions}</div>}
    </div>
  );
}

export function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="text-xs text-destructive">{msg}</p> : null;
}
