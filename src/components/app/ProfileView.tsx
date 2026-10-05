import { formatSalaryAmount } from "@/lib/salary";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Account } from "@/lib/account";
import { PageHeader } from "./AppShell";

function Item({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 text-sm">{value || "—"}</dd></div>;
}
function Chips({ items }: { items: string[] }) {
  return <div className="flex flex-wrap gap-1.5">{items.length ? items.map((t) => <span key={t} className="rounded-full border border-border px-3 py-1 text-xs font-medium">{t}</span>) : <span className="text-sm text-muted-foreground">—</span>}</div>;
}
const card = "rounded-2xl border border-border bg-card p-6 shadow-soft";

export function CandidateProfileView({ account }: { account: Account }) {
  const { data: p } = useQuery({
    queryKey: ["candidate_profile", account.userId],
    queryFn: async () => (await supabase.from("candidate_profiles").select("*").eq("user_id", account.userId).maybeSingle()).data,
  });
  return (
    <>
      <PageHeader title={`${account.firstName} ${account.lastName}`} subtitle={p?.headline} />
      <div className="grid max-w-4xl gap-6">
        <section className={card}><dl className="grid gap-5 sm:grid-cols-3">
          <Item label="Current Role" value={p?.job_title ?? ""} /><Item label="Experience" value={p ? `${p.years_experience} years` : ""} /><Item label="Location" value={p?.location ?? ""} />
        </dl><p className="mt-5 text-sm text-muted-foreground">{p?.summary}</p></section>
        <section className={`${card} space-y-4`}>
          <h2 className="font-bold">Technical Qualifications</h2>
          <Chips items={[...(p?.programming_languages ?? []), ...(p?.technical_skills ?? []), ...(p?.tools ?? [])]} />
        </section>
        <section className={card}><h2 className="mb-4 font-bold">Career Preferences</h2><dl className="grid gap-5 sm:grid-cols-3">
          <Item label="Target Roles" value={(p?.target_roles ?? []).join(", ")} /><Item label="Salary" value={formatSalaryAmount(p?.salary_amount, p?.salary_currency)} /><Item label="Work Arrangement" value={p?.work_arrangement ?? ""} />
        </dl></section>
      </div>
    </>
  );
}

export function RecruiterProfileView({ account, company = false }: { account: Account; company?: boolean }) {
  const { data: p } = useQuery({
    queryKey: ["recruiter_profile", account.userId],
    queryFn: async () => (await supabase.from("recruiter_profiles").select("*").eq("user_id", account.userId).maybeSingle()).data,
  });
  if (company) return (
    <>
      <PageHeader title={p?.company_name || "Company"} subtitle={p?.industry} />
      <section className={`${card} max-w-4xl`}><dl className="grid gap-5 sm:grid-cols-3">
        <Item label="Website" value={p?.company_website ?? ""} /><Item label="Industry" value={p?.industry ?? ""} /><Item label="Organization Type" value={p?.organization_type ?? ""} />
      </dl><p className="mt-5 text-sm text-muted-foreground">{p?.company_description}</p></section>
    </>
  );
  return (
    <>
      <PageHeader title={`${account.firstName} ${account.lastName}`} subtitle={p?.title} />
      <section className={`${card} max-w-4xl`}><dl className="grid gap-5 sm:grid-cols-2">
        <Item label="Specialization" value={p?.specialization ?? ""} /><Item label="Experience" value={p ? `${p.years_experience} years` : ""} />
        <Item label="Location" value={p?.location ?? ""} /><Item label="Company" value={p?.company_name ?? ""} />
      </dl></section>
    </>
  );
}
