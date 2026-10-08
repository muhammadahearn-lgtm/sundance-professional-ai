import { LocationFields } from "@/components/location/LocationFields";
import { formatLocation, type LocationParts } from "@/lib/location";
import { ProfilePhoto } from "@/components/app/ProfilePhoto";
import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Bell, Briefcase, Building2, Eye, Globe2, MapPin, Pencil, Radar, Target, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Account } from "@/lib/account";
import { computeRecruiterCompletion, RECRUITER_SUMMARY_MAX, validateRecruiter } from "@/lib/recruiter-completion";
import { Chips, Field, SaveBar, Section, TagInput, card, friendlyError, inputCls } from "@/components/profile/parts";
import { ProfileTabBar, useProfileTab } from "@/components/profile/ProfileTabs";
import { SearchPicker } from "@/components/taxonomy/SearchPicker";
import { addCompanyEntry, loadJobCompanies, newCompanyName } from "@/lib/company-add";
import { isLastAdmin, loadTeam, type TeamMember } from "@/lib/company-team";
import {
  CANDIDATE_TYPES, CONTACT_METHODS, CompletionCard, EXPERIENCE_LEVELS, INDUSTRIES, Item, MultiToggle, REGIONS, Switch, VISIBILITY, WORK_ARRANGEMENTS, BrandImg, initials,
} from "./shared";

async function load(uid: string) {
  const [prof, acct, roles, companies] = await Promise.all([
    supabase.from("recruiter_profiles").select("*").eq("user_id", uid).maybeSingle(),
    supabase.from("profiles").select("first_name, last_name, email").eq("user_id", uid).maybeSingle(),
    supabase.from("roles").select("role_name").order("role_name"),
    loadJobCompanies(),
  ]);
  const err = [prof, acct, roles].find((r) => r.error)?.error;
  if (err) throw err;
  let company = null;
  let team: TeamMember[] = [];
  if (prof.data?.company_id) {
    const c = await supabase.from("companies").select("*").eq("company_id", prof.data.company_id).maybeSingle();
    if (c.error) throw c.error;
    company = c.data;
    team = await loadTeam(prof.data.company_id).catch(() => []);
  }
  return { r: prof.data, a: acct.data, company, roleNames: (roles.data ?? []).map((x) => x.role_name), companies, team };
}
type Data = Awaited<ReturnType<typeof load>>;
type R = NonNullable<Data["r"]>;
type RUpdate = Partial<Omit<R, "user_id" | "created_at" | "updated_at">>;

export function RecruiterProfilePage({ account }: { account: Account }) {
  const uid = account.userId;
  const [photo, setPhoto] = useState(account.avatarPath);
  const qc = useQueryClient();
  const key = ["recruiter-full", uid];
  const { data, isLoading, error, refetch } = useQuery({ queryKey: key, queryFn: () => load(uid) });
  const [preview, setPreview] = useState(false);
  const [edit, setEdit] = useState<"pro" | "spec" | "ind" | "focus" | null>(null);
  const [tab, setTab] = useProfileTab(["about", "focus", "settings"] as const, "about");

  if (isLoading) return <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className={`${card} h-40 animate-pulse`} />)}</div>;
  if (error || !data) return (
    <div className={`${card} p-8 text-center`}>
      <p className="font-semibold">{friendlyError(error, "We couldn't load your profile.")}</p>
      <button onClick={() => refetch()} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Try again</button>
    </div>
  );
  if (!data.r || !data.a) return <div className={`${card} p-8 text-center`}>Your profile hasn't been set up yet. Please finish onboarding.</div>;

  const r = data.r, a = data.a, co = data.company;
  const save = async (patch: RUpdate, ok: string) => {
    const { error: e } = await supabase.from("recruiter_profiles").update(patch).eq("user_id", uid);
    if (e) { toast.error(friendlyError(e, "Failed to save profile.")); return false; }
    toast.success(ok);
    await qc.invalidateQueries({ queryKey: key });
    return true;
  };
  const { percent, suggestions } = computeRecruiterCompletion({
    firstName: a.first_name, lastName: a.last_name, title: r.title, location: r.location, yearsExperience: r.years_experience,
    specialization: r.specialization, secondaryCount: r.secondary_specializations.length, candidateTypeCount: r.preferred_candidate_types.length,
    industryCount: r.industry_specializations.length, summary: r.professional_summary,
    hasCompany: !!co, companyComplete: !!co && !!co.description.trim() && !!co.industry.trim(),
  });
  const companyName = co?.company_name || r.company_name;

  if (preview) return <Preview data={data} onBack={() => setPreview(false)} />;

  const editBtn = (k: NonNullable<typeof edit>) => edit !== k && (
    <button onClick={() => setEdit(k)} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold hover:border-primary hover:text-primary"><Pencil className="h-4 w-4" aria-hidden /><span className="sr-only sm:not-sr-only">Edit</span></button>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-6">
        <div className={`${card} p-6`}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <ProfilePhoto uid={uid} path={photo} initials={initials(a.first_name, a.last_name)} className="h-20 w-20 text-2xl" rounded="rounded-2xl" editable onChange={(p2) => { setPhoto(p2); void qc.invalidateQueries(); }} />
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl font-extrabold">{a.first_name} {a.last_name}</h1>
              <p className="font-medium">{r.title || "Add your title"}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Building2 className="h-4 w-4" />{companyName || "No company"}</span>
                <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{r.location || "No location"}</span>
                <span className="inline-flex items-center gap-1"><Briefcase className="h-4 w-4" />{r.years_experience} Years Recruiting Experience</span>
              </div>
          <div className="mt-3 flex items-center gap-3"><div className="h-1.5 w-40 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${percent}%` }} /></div><span className="text-xs font-semibold text-primary">Profile Completion {percent}%</span></div>
          </div>
        </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/recruiter/company" className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary"><Building2 className="h-4 w-4" />View Company Profile</Link>
          </div>
        </div>

        <ProfileTabBar value={tab} onChange={setTab} action={
          { key: "about", label: "About Me", icon: <UserRound className="h-4 w-4" />, incomplete: !r.title || !r.location || !r.professional_summary },
          { key: "focus", label: "Recruiting Focus", icon: <Target className="h-4 w-4" />, incomplete: !r.specialization || !r.industry_specializations.length },
          { key: "settings", label: "Visibility & Alerts", icon: <Bell className="h-4 w-4" /> },
        ]} />

        {tab === "about" && <Section id="professional" title="Professional Information" icon={<UserRound className="h-4 w-4" />} action={editBtn("pro")}>
          {edit === "pro" ? <ProForm uid={uid} r={r} a={a} companyName={companyName} companies={data.companies} team={data.team} onDone={async (ok) => { if (ok) await qc.invalidateQueries({ queryKey: key }); setEdit(null); }} /> : (
            <div className="space-y-5">
              <dl className="grid gap-5 sm:grid-cols-3">
                <Item k="First Name" v={a.first_name} /><Item k="Last Name" v={a.last_name} /><Item k="Recruiter Title" v={r.title} />
                <Item k="Company" v={companyName} /><Item k="Location" v={r.location} /><Item k="Years Recruiting" v={`${r.years_experience}`} />
              </dl>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Professional Summary</dt><p className="mt-1 whitespace-pre-line text-sm">{r.professional_summary || "—"}</p></div>
            </div>
          )}
        </Section>}

        {tab === "focus" && <>
        <Section title="Recruiting Specialization" icon={<Target className="h-4 w-4" />} action={editBtn("spec")}>
          {edit === "spec" ? (
            <ArrayForm initial={{ specialization: r.specialization, secondary: r.secondary_specializations, types: r.preferred_candidate_types }} onCancel={() => setEdit(null)}
              onSave={async (v) => {
                if (!v.specialization.trim()) { toast.error("Recruiting specialization is required."); return; }
                if (await save({ specialization: v.specialization.trim(), secondary_specializations: v.secondary, preferred_candidate_types: v.types }, "Specializations updated")) setEdit(null);
              }}
              render={(v, set) => (<>
                <Field label="Primary Specialization *"><input className={inputCls} list="cand-types" value={v.specialization} onChange={(e) => set({ ...v, specialization: e.target.value })} placeholder="e.g. Software Engineers" /></Field>
                <datalist id="cand-types">{CANDIDATE_TYPES.map((t) => <option key={t} value={t} />)}</datalist>
                <Field label="Secondary Specializations"><TagInput value={v.secondary} onChange={(x) => set({ ...v, secondary: x })} options={CANDIDATE_TYPES} placeholder="Type to add…" /></Field>
                <div className="space-y-1.5"><span className="text-sm font-medium">Preferred Candidate Types</span><MultiToggle options={CANDIDATE_TYPES} value={v.types} onChange={(x) => set({ ...v, types: x })} /></div>
              </>)} />
          ) : (
            <dl className="grid gap-5 sm:grid-cols-2">
              <Item k="Primary Specialization" v={r.specialization} /><Item k="Years Recruiting" v={`${r.years_experience}`} />
              <Item k="Secondary Specializations" v={<Chips items={r.secondary_specializations} />} /><Item k="Preferred Candidate Types" v={<Chips items={r.preferred_candidate_types} />} />
            </dl>
          )}
        </Section>

        <Section title="Industry Specialization" icon={<Building2 className="h-4 w-4" />} action={editBtn("ind")}>
          {edit === "ind" ? (
            <ArrayForm initial={{ ind: r.industry_specializations }} onCancel={() => setEdit(null)}
              onSave={async (v) => { if (await save({ industry_specializations: v.ind }, "Industries updated")) setEdit(null); }}
              render={(v, set) => <MultiToggle options={INDUSTRIES} value={v.ind} onChange={(x) => set({ ind: x })} />} />
          ) : <Chips items={r.industry_specializations} />}
        </Section>

        <Section title="Hiring Focus" icon={<Globe2 className="h-4 w-4" />} action={editBtn("focus")}>
          {edit === "focus" ? (
            <ArrayForm initial={{ roles: r.roles_recruited, levels: r.experience_levels, regions: r.geographic_regions, arr: r.work_arrangements }} onCancel={() => setEdit(null)}
              onSave={async (v) => { if (await save({ roles_recruited: v.roles, experience_levels: v.levels, geographic_regions: v.regions, work_arrangements: v.arr }, "Hiring focus updated")) setEdit(null); }}
              render={(v, set) => (<>
                <Field label="Roles Recruited For"><TagInput value={v.roles} onChange={(x) => set({ ...v, roles: x })} options={data.roleNames} placeholder="Type to add a role…" /></Field>
                <div className="space-y-1.5"><span className="text-sm font-medium">Experience Levels</span><MultiToggle options={EXPERIENCE_LEVELS} value={v.levels} onChange={(x) => set({ ...v, levels: x })} /></div>
                <Field label="Geographic Regions"><TagInput value={v.regions} onChange={(x) => set({ ...v, regions: x })} placeholder="e.g. United States — press Enter" /></Field>
                <div className="flex flex-wrap gap-1.5">{REGIONS.filter((x) => !v.regions.includes(x)).map((x) => <button type="button" key={x} onClick={() => set({ ...v, regions: [...v.regions, x] })} className="rounded-full border border-border px-3 py-1 text-xs hover:border-primary hover:text-primary">+ {x}</button>)}</div>
                <div className="space-y-1.5"><span className="text-sm font-medium">Work Arrangements</span><MultiToggle options={WORK_ARRANGEMENTS} value={v.arr} onChange={(x) => set({ ...v, arr: x })} /></div>
              </>)} />
          ) : (
            <dl className="grid gap-5 sm:grid-cols-2">
              <Item k="Roles Recruited For" v={<Chips items={r.roles_recruited} />} /><Item k="Experience Levels" v={<Chips items={r.experience_levels} />} />
              <Item k="Geographic Regions" v={<Chips items={r.geographic_regions} />} /><Item k="Work Arrangements" v={<Chips items={r.work_arrangements} />} />
            </dl>
          )}
        </Section>
        </>}

        {tab === "settings" && <>
        <Section title="Communication Preferences" icon={<Bell className="h-4 w-4" />}>
          <div className="space-y-3">
            <Field label="Preferred Contact Method">
              <select className={inputCls} value={r.preferred_contact_method} onChange={(e) => save({ preferred_contact_method: e.target.value }, "Preferences updated")}>
                {CONTACT_METHODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Field>
            <div className="divide-y divide-border">
              <Switch label="Email Notifications" checked={r.notify_email} onChange={(v) => save({ notify_email: v }, "Preferences updated")} />
              <Switch label="Candidate Alerts" checked={r.notify_candidates} onChange={(v) => save({ notify_candidates: v }, "Preferences updated")} />
              <Switch label="Application Alerts" checked={r.notify_applications} onChange={(v) => save({ notify_applications: v }, "Preferences updated")} />
              <Switch label="Pipeline Alerts" checked={r.notify_pipeline} onChange={(v) => save({ notify_pipeline: v }, "Preferences updated")} />
            </div>
          </div>
        </Section>

        <Section title="Recruiter Visibility" icon={<Radar className="h-4 w-4" />}>
          <div className="grid gap-3 sm:grid-cols-3">
            {VISIBILITY.map(([k, l, d]) => {
              const on = r.recruiter_visibility === k;
              return (
                <button key={k} type="button" aria-pressed={on} onClick={() => !on && save({ recruiter_visibility: k }, "Visibility updated")}
                  className={`rounded-2xl border p-4 text-left transition-colors ${on ? "border-primary bg-primary-soft" : "border-border hover:border-primary"}`}>
                  <p className={`font-semibold ${on ? "text-primary" : ""}`}>{l}</p><p className="mt-1 text-xs text-muted-foreground">{d}</p>
                </button>
              );
            })}
          </div>
        </Section>
        </>}
      </div>
      <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
        <CompletionCard percent={percent} suggestions={suggestions} />
      </aside>
    </div>
  );
}

function ArrayForm<T>({ initial, onSave, onCancel, render }: { initial: T; onSave: (v: T) => Promise<void>; onCancel: () => void; render: (v: T, set: (v: T) => void) => ReactNode }) {
  const [v, setV] = useState(initial);
  const [saving, setSaving] = useState(false);
  return (
    <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSave(v); setSaving(false); }}>
      {render(v, setV)}
      <SaveBar saving={saving} onCancel={onCancel} />
    </form>
  );
}

function ProForm({ uid, r, a, companyName, companies, team, onDone }: { uid: string; r: R; a: NonNullable<Data["a"]>; companyName: string; companies: { id: string; name: string }[]; team: TeamMember[]; onDone: (ok: boolean) => void }) {
  const [f, setF] = useState({ first_name: a.first_name, last_name: a.last_name, title: r.title, company_name: companyName, location: r.location, years: String(r.years_experience), specialization: r.specialization, summary: r.professional_summary });
  const [companyId, setCompanyId] = useState(r.company_id ?? "");
  const [loc, setLoc] = useState<LocationParts>({ country: r.location_country, state: r.location_state, city: r.location_city });
  const [errs, setErrs] = useState<ReturnType<typeof validateRecruiter>>({});
  const [saving, setSaving] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validateRecruiter({ ...f, location: formatLocation(loc) });
    if (!loc.country || !loc.state.trim() || !loc.city.trim()) (v as Record<string, string>)["location"] = "Country, state / province and city are required.";
    setErrs(v);
    if (Object.keys(v).length) { toast.error("Missing required fields."); return; }
    if (r.company_id && companyId !== r.company_id && isLastAdmin(team, uid)) {
      toast.error(`You're the only admin of ${companyName}. Promote another member in Company → Team before switching. Just fixing a typo? Rename the company in Company → Branding instead.`, { duration: 9000 });
      return;
    }
    const picked = companies.find((co) => co.id === companyId);
    setSaving(true);
    const [p1, p2] = await Promise.all([
      supabase.from("profiles").update({ first_name: f.first_name.trim(), last_name: f.last_name.trim() }).eq("user_id", uid),
      supabase.from("recruiter_profiles").update({
        title: f.title.trim(), company_name: (picked?.name ?? f.company_name).trim(), company_id: companyId || null, location: formatLocation(loc), location_country: loc.country, location_state: loc.state, location_city: loc.city, specialization: f.specialization.trim(),
        years_experience: Math.max(0, Math.min(60, Number(f.years) || 0)), professional_summary: f.summary,
      }).eq("user_id", uid),
    ]);
    setSaving(false);
    const err = p1.error ?? p2.error;
    if (err) { toast.error(friendlyError(err, "Failed to save profile.")); return; }
    toast.success("Recruiter profile updated");
    onDone(true);
  };
  const inp = (k: keyof typeof f, l: string, extra?: { type?: string; placeholder?: string }) => (
    <Field label={l} error={errs[k as keyof typeof errs]}><input className={inputCls} type={extra?.type ?? "text"} placeholder={extra?.placeholder} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></Field>
  );
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {inp("first_name", "First Name *")}{inp("last_name", "Last Name *")}
        {inp("title", "Recruiter Title *", { placeholder: "Senior Technical Recruiter" })}
        <Field label="Employer or Agency *" error={errs.company_name} hint={<span className="text-xs text-muted-foreground">The company you work for (not a job's client — pick clients per job). Changing this moves your team workspace; your sign-in email stays the same.</span>}>
          <SearchPicker ariaLabel="Company" options={companies} value={companyId} onChange={setCompanyId} placeholder="Search or add a company" nameFor={newCompanyName} addHint="Existing names are reused automatically (e.g. “Acme Inc.” = “Acme”)." onAdd={addCompanyEntry} />
        </Field>
        <LocationFields required error={(errs as Record<string, string | undefined>)["location"]} value={loc} onChange={setLoc} />
        {inp("years", "Years Recruiting Experience", { type: "number" })}
        {inp("specialization", "Primary Specialization *", { placeholder: "Software Engineers" })}
      </div>
      <Field label="Professional Summary" error={errs.summary} hint={<span className={`text-xs ${f.summary.length > RECRUITER_SUMMARY_MAX ? "text-destructive" : "text-muted-foreground"}`}>{f.summary.length}/{RECRUITER_SUMMARY_MAX}</span>}>
        <textarea rows={6} className={inputCls} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} placeholder="How you work with candidates, what you recruit for, and what makes your process different." />
      </Field>
      <SaveBar saving={saving} onCancel={() => onDone(false)} />
    </form>
  );
}

function Preview({ data, onBack }: { data: Data; onBack: () => void }) {
  const r = data.r!, a = data.a!, co = data.company;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary-soft px-4 py-3 text-sm">
        <span className="font-semibold text-primary">Preview — this is how candidates see your profile</span>
        <button onClick={onBack} className="inline-flex items-center gap-1.5 rounded-xl bg-card px-3 py-1.5 font-semibold hover:text-primary"><ArrowLeft className="h-4 w-4" />Back to editing</button>
      </div>
      <div className={`${card} p-6`}>
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary font-display text-xl font-extrabold text-primary-foreground">{initials(a.first_name, a.last_name)}</div>
          <div>
            <h1 className="font-display text-xl font-extrabold">{a.first_name} {a.last_name}</h1>
            <p className="text-sm">{r.title} · {co?.company_name || r.company_name}</p>
            <p className="text-sm text-muted-foreground">{r.location} · {r.years_experience} years recruiting</p>
          </div>
          <span className="ml-auto hidden rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary sm:inline">{VISIBILITY.find(([k]) => k === r.recruiter_visibility)?.[1]}</span>
        </div>
        {r.professional_summary && <p className="mt-5 whitespace-pre-line text-sm">{r.professional_summary}</p>}
      </div>
      <div className={`${card} p-6`}>
        <h2 className="font-display text-lg font-bold">Recruiting Focus</h2>
        <dl className="mt-4 grid gap-5 sm:grid-cols-2">
          <Item k="Specialization" v={r.specialization} /><Item k="Secondary" v={<Chips items={r.secondary_specializations} />} />
          <Item k="Industries" v={<Chips items={r.industry_specializations} />} /><Item k="Experience Levels" v={<Chips items={r.experience_levels} />} />
          <Item k="Regions" v={<Chips items={r.geographic_regions} />} /><Item k="Work Arrangements" v={<Chips items={r.work_arrangements} />} />
        </dl>
      </div>
      <div className={`${card} flex items-center gap-4 p-6`}>
        {co?.logo_url ? <BrandImg path={co.logo_url} alt="Company logo" className="h-14 w-14 rounded-xl object-cover" /> : <div className="grid h-14 w-14 place-items-center rounded-xl bg-muted"><Building2 className="h-6 w-6 text-muted-foreground" /></div>}
        <div className="min-w-0"><p className="font-semibold">{co?.company_name || r.company_name || "No company yet"}</p><p className="truncate text-sm text-muted-foreground">{co ? [co.industry, co.company_size && `${co.company_size} employees`].filter(Boolean).join(" · ") : "Company profile not set up"}</p></div>
      </div>
    </div>
  );
}
