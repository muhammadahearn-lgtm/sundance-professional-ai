import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, ChevronRight, FileSignature, KanbanSquare } from "lucide-react";
import { latestOffer } from "@/lib/offers-data";
import { formatSalaryAmount } from "@/lib/salary";
import type { Conversation } from "@/components/messages/Messages";

const pill = "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground transition hover:border-primary hover:text-primary";
const OFFER_TEXT: Record<string, string> = { pending: "Offer pending", accepted: "Offer accepted", declined: "Offer declined", expired: "Offer expired" };

/** Pinned under the chat header: which job this chat is about, plus shortcuts for each side. */
export function JobContextStrip({ c, role }: { c: Conversation; role: "recruiter" | "candidate" }) {
  const jobId = c.job_id!;
  const offer = useQuery({ queryKey: ["offer-pill", jobId, c.candidate_id], queryFn: () => latestOffer(jobId, c.candidate_id) });
  const o = offer.data && offer.data.status !== "withdrawn" ? offer.data : null;
  const salary = o ? formatSalaryAmount(o.salary_amount, o.salary_currency) : "";
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-primary-soft/40 px-4 py-2">
      <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
        <Briefcase className="h-4 w-4 shrink-0 text-primary" />
        {role === "candidate"
          ? <Link to="/candidate/jobs/$id" params={{ id: jobId }} className="truncate hover:text-primary hover:underline">{c.job_title ?? "View job"}</Link>
          : <Link to="/recruiter/jobs/$id" params={{ id: jobId }} className="truncate hover:text-primary hover:underline">{c.job_title ?? "View job"}</Link>}
        {c.company_name && <span className="truncate font-normal text-muted-foreground">· {c.company_name}</span>}
      </span>
      {o && <span className="rounded-full bg-card px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{OFFER_TEXT[o.status] ?? "Offer"}{salary ? ` · ${salary}` : ""} · Rev {o.revision}</span>}
      <div className="ml-auto flex flex-wrap gap-2">
        {role === "recruiter" ? <>
          <Link to="/recruiter/pipeline/$jobId" params={{ jobId }} search={{ candidate: c.candidate_id }} className={pill}>
            {o?.status === "pending" ? <><FileSignature className="h-3.5 w-3.5" />Review Offer</> : <><KanbanSquare className="h-3.5 w-3.5" />View in Pipeline</>}<ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </> : <>
          {o && c.application_id
            ? <Link to="/candidate/applications/$id" params={{ id: c.application_id }} className={pill}><FileSignature className="h-3.5 w-3.5" />View Offer<ChevronRight className="h-3.5 w-3.5" /></Link>
            : c.application_id && <Link to="/candidate/applications/$id" params={{ id: c.application_id }} className={pill}>My Application<ChevronRight className="h-3.5 w-3.5" /></Link>}
        </>}
      </div>
    </div>
  );
}
