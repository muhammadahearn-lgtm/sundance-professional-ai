import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, Mail, Trash2, UserPlus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { HIRING_ROLES, TEAM_MAX, isDuplicateEmail, stakeholderSchema } from "@/lib/hiring-team";
import { friendlyError, inputCls } from "@/components/profile/parts";

type Row = { stakeholder_id: string; name: string; hiring_role: string; email: string; notify_on_interview: boolean; notify_on_shortlist: boolean };

/** Hiring team for a job: people who get email updates only, with no account or job access. */
export function HiringTeamPanel({ jobId }: { jobId?: string | undefined }) {
  const qc = useQueryClient();
  const key = ["job-stakeholders", jobId];
  const { data: team = [] } = useQuery({
    queryKey: key, enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await supabase.from("job_stakeholders").select("stakeholder_id, name, hiring_role, email, notify_on_interview, notify_on_shortlist").eq("job_id", jobId!).order("created_at");
      if (error) throw error;
      return data as Row[];
    },
  });
  const [draft, setDraft] = useState({ name: "", hiring_role: HIRING_ROLES[0]!, email: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const p = stakeholderSchema.safeParse(draft);
    if (!p.success) return setErr(p.error.issues[0]?.message ?? "Check the details");
    if (isDuplicateEmail(team, p.data.email)) return setErr("This person is already on the hiring team.");
    if (team.length >= TEAM_MAX) return setErr(`Up to ${TEAM_MAX} people per job.`);
    setBusy(true); setErr("");
    const { error } = await supabase.from("job_stakeholders").insert({ job_id: jobId!, ...p.data });
    setBusy(false);
    if (error) return setErr(friendlyError(error, "Couldn't add this person."));
    setDraft({ name: "", hiring_role: draft.hiring_role, email: "" });
    qc.invalidateQueries({ queryKey: key });
    toast.success(`${p.data.name} added to the hiring team`);
  };
  const update = async (id: string, patch: Partial<Row>) => {
    const { error } = await supabase.from("job_stakeholders").update(patch).eq("stakeholder_id", id);
    if (error) toast.error(friendlyError(error, "Couldn't update.")); else qc.invalidateQueries({ queryKey: key });
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("job_stakeholders").delete().eq("stakeholder_id", id);
    if (error) toast.error(friendlyError(error, "Couldn't remove.")); else qc.invalidateQueries({ queryKey: key });
  };

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-4">
      <div className="mb-3 flex items-start gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"><Users className="h-4 w-4" /></span>
        <div>
          <p className="text-sm font-semibold">Hiring Team (optional)</p>
          <p className="text-xs text-muted-foreground">People involved in this hire get email updates when candidates are shortlisted or interviews are scheduled. They don't need an account and can't see or edit this job.</p>
        </div>
      </div>
      {!jobId ? (
        <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">Save a draft first, then add your hiring team here.</p>
      ) : (
        <>
          {team.length > 0 && (
            <ul className="mb-3 space-y-2">
              {team.map((s) => (
                <li key={s.stakeholder_id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-3 py-2" data-no-glow>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{s.name} <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{s.hiring_role}</span></p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><Mail className="h-3 w-3" />{s.email}</p>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={s.notify_on_shortlist} onChange={(e) => update(s.stakeholder_id, { notify_on_shortlist: e.target.checked })} />Shortlist updates</label>
                  <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={s.notify_on_interview} onChange={(e) => update(s.stakeholder_id, { notify_on_interview: e.target.checked })} />Interview updates</label>
                  <button type="button" aria-label={`Remove ${s.name}`} onClick={() => remove(s.stakeholder_id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1.3fr_auto]">
            <input aria-label="Name" className={inputCls} placeholder="Name (e.g. John Doe)" value={draft.name} maxLength={100} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <input aria-label="Role in hiring" list="hiring-roles" className={inputCls} placeholder="Role" value={draft.hiring_role} maxLength={60} onChange={(e) => setDraft({ ...draft, hiring_role: e.target.value })} />
            <datalist id="hiring-roles">{HIRING_ROLES.map((r) => <option key={r} value={r} />)}</datalist>
            <input aria-label="Email" type="email" className={inputCls} placeholder="john@company.com" value={draft.email} maxLength={255} onChange={(e) => setDraft({ ...draft, email: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void add(); } }} />
            <button type="button" disabled={busy} onClick={add} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"><UserPlus className="h-4 w-4" />Add</button>
          </div>
          {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
          <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground"><Bell className="h-3 w-3" />Emails include the candidate's first name and last initial, the job title and interview logistics — never contact details or resumes.</p>
        </>
      )}
    </div>
  );
}
