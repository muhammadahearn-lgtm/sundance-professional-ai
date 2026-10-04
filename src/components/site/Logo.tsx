import { Link } from "@tanstack/react-router";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-soft">
        <span className="h-3 w-3 rounded-full bg-primary-foreground" />
      </span>
      <span className="font-display text-lg font-extrabold tracking-tight">
        Sundance<span className="text-primary"> Professionals</span>
      </span>
    </Link>
  );
}
