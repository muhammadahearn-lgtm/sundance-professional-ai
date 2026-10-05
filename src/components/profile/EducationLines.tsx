import { educationLines, type EduLike } from "@/lib/education";

/** Standard education display: Degree Type / Field Of Study / Institution / Year. */
export function EducationLines({ e }: { e: EduLike }) {
  const [first, ...rest] = educationLines(e);
  return (
    <div>
      <p className="font-semibold">{first}</p>
      {rest.map((l, i) => <p key={i} className={i === rest.length - 1 && /^\d{4}$/.test(l) ? "text-xs text-muted-foreground" : "text-sm text-muted-foreground"}>{l}</p>)}
    </div>
  );
}
