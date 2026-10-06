import { PanelShowButton, PanelToggleButton } from "@/components/ui/panel-toggle";
import { LocationFilter } from "@/components/location/LocationFields";
import { EducationLines } from "@/components/profile/EducationLines";
import { DEGREE_TYPES, educationAlignment, highestDegree, type EducationAlignment } from "@/lib/education";
import { SearchPicker } from "@/components/taxonomy/SearchPicker";
import { formatSalaryAmount } from "@/lib/salary";
import { LinkBadges, ProjectList } from "@/components/profile/links-projects";
import { track } from "@/lib/track";
import { useAvatarUrl } from "@/components/app/ProfilePhoto";
import { MessageButton } from "@/components/messages/Messages";
import { ReportButton } from "@/components/moderation/ReportButton";
import { LocationAlignmentBadge, EducationAlignmentBadge, MatchBadge, MatchFilter, useAutoRecalc, useScores, type ScoreRow } from "@/components/match/Match";
import { locationAlignment, type LocationAlignment } from "@/lib/location";
import { meetsMinMatch } from "@/lib/match-engine";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck, Briefcase, ChevronDown, Download, GitCompare, LayoutGrid, List, MapPin, MessageSquare, Search, SlidersHorizontal, Sparkles, UserPlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFiltersHidden } from "@/hooks/use-filters-hidden";
import { PanelReveal, PanelSeparator, usePanelWidth } from "@/components/ui/panel-separator";
import { loadTaxonomy, type Taxonomy } from "@/lib/jobs-data";
import { listComparedCandidates, listSavedCandidates, listTalent, loadCandidateFull, resumeUrl, setComparedCandidate, setSavedCandidate, talentByIds, type CandidateFull } from "@/lib/talent-data";
import { CANDIDATE_COMPARE_MAX, DEFAULT_TALENT, EXPERIENCE_BUCKETS, TALENT_INDUSTRIES, TALENT_PAGE_SIZE, effectiveTalentSort, isMatchSort, talentSortOptions, matchesTalent, sortTalent, talentFilterCount, type TalentFilters, type TalentRow } from "@/lib/talent-rules";
import { ARRANGEMENTS, AVAILABILITY, card, cap, friendlyError, inputCls, label } from "@/components/profile/parts";
import { Item, MultiToggle } from "@/components/recruiter/shared";
import { SearchSelect } from "@/components/ui/search-select";
import { AiTopPick, BestTag, RankPill } from "@/components/compare/AiTopPick";
import { bestBy, rankCompare } from "@/lib/compare-rank";

/** Highest score each candidate has across the recruiter's jobs. */
export function useBestScores() {
  const s = useScores({});
  return useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of s.data ?? []) m[r.candidate_id] = Math.max(m[r.candidate_id] ?? 0, Number(r.overall_match_score));
    return m;
  }, [s.data]);
}
export const useTaxonomy = () => useQuery({ queryKey: ["taxonomy"], queryFn: loadTaxonomy, staleTime: 5 * 60_000 });
export const nameOf = (opts: { id: string; name: string }[], id: string) => opts.find((o) => o.id === id)?.name ?? "";
export const btn = "inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold hover:border-primary hover:text-primary";
export const primaryBtn = "inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50";

export function Avatar({ name, size = "h-12 w-12 text-base", path }: { name?: string | null | undefined; size?: string; path?: string | null | undefined }) {
  const url = useAvatarUrl(path);
  // Name can be missing (e.g. a deleted account or a name not loaded yet) — never crash.
  const safe = (name ?? "").trim();
  const i = safe.split(/\s+/).filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "?";
  return <div className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-primary font-display font-bold text-primary-foreground ${size}`} aria-hidden={url ? undefined : true}>{url ? <img src={url} alt={safe ? `${safe} photo` : "Profile photo"} className="h-full w-full object-cover" /> : i}</div>;
}
export function Chips({ ids, opts, max = 5, soft = false }: { ids: string[]; opts: { id: string; name: string }[]; max?: number; soft?: boolean }) {
  if (!ids.length) return <span className="text-xs text-muted-foreground">—</span>;
  return <div className="flex flex-wrap gap-1.5">{ids.slice(0, max).map((id) => <span key={id} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${soft ? "bg-indigo/10 text-indigo" : "bg-primary-soft text-primary"}`}>{nameOf(opts, id)}</span>)}{ids.length > max && <span className="text-xs text-muted-foreground">+{ids.length - max}</span>}</div>;
}
export function ErrorBox({ msg, retry }: { msg: string; retry: () => void }) {
  return <div className={`${card} p-8 text-center`} role="alert"><p className="font-semibold">{msg}</p><button onClick={retry} className={`${primaryBtn} mt-4`}>Try again</button></div>;
}
export function MatchPlaceholder({ items = ["Overall Match Score", "Skill Alignment", "Technology Alignment", "Experience Alignment"] }: { items?: string[] }) {
  return (
    <div className={`${card} border-dashed p-5`}>
      <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><p className="font-display font-bold">Match Score</p><span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">Coming Soon</span></div>
      <ul className="mt-4 space-y-3">{items.map((l) => <li key={l}><div className="flex justify-between text-xs"><span>{l}</span><span className="text-muted-foreground">—</span></div><div className="mt-1 h-1.5 rounded-full bg-muted" /></li>)}</ul>
    </div>
  );
}
const soon = (what: string) => () => toast.info(`${what} is coming in a future update.`);

export function useCandidateLists(uid: string) {
  const qc = useQueryClient();
  const saved = useQuery({ queryKey: ["saved-cands", uid], queryFn: () => listSavedCandidates(uid) });
  const cmp = useQuery({ queryKey: ["cmp-cands", uid], queryFn: () => listComparedCandidates(uid) });
  const s = saved.data ?? [], c = cmp.data ?? [];
  const toggle = async (key: string, list: string[], id: string, fn: typeof setSavedCandidate, msgs: [string, string]) => {
    const on = !list.includes(id);
    if (key === "cmp-cands" && on && list.length >= CANDIDATE_COMPARE_MAX) { toast.error(`You can compare up to ${CANDIDATE_COMPARE_MAX} candidates. Remove one first.`); return; }
    qc.setQueryData<string[]>([key, uid], (p = []) => (on ? [...p, id] : p.filter((x) => x !== id)));
    try { await fn(uid, id, on); toast.success(on ? msgs[0] : msgs[1]); } catch (e) { toast.error(friendlyError(e, "Couldn't update. Please try again.")); }
    await qc.invalidateQueries({ queryKey: [key, uid] });
  };
  return {
    savedIds: s, compareIds: c, isSaved: (id: string) => s.includes(id), isCompared: (id: string) => c.includes(id),
    toggleSave: (id: string) => toggle("saved-cands", s, id, setSavedCandidate, ["Candidate saved", "Candidate removed from saved"]),
    toggleCompare: (id: string) => toggle("cmp-cands", c, id, setComparedCandidate, ["Added to comparison", "Removed from comparison"]),
  };
}
type Lists = ReturnType<typeof useCandidateLists>;

export function CandidateCard({ c, t, lists, score, jobTitle, row, locAlign, eduAlign }: { c: TalentRow; t: Taxonomy; lists: Lists; score?: number | undefined; jobTitle?: string | undefined; row?: ScoreRow | undefined; locAlign?: LocationAlignment | undefined; eduAlign?: EducationAlignment | null | undefined }) {
  const saved = lists.isSaved(c.id), cmp = lists.isCompared(c.id);
  const [open, setOpen] = useState(false);
  return (
    <article className={`${card} p-5`}>
      <div className="flex gap-4">
        <Avatar name={c.name} path={c.avatarPath} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0"><Link to="/recruiter/candidates/$id" params={{ id: c.id }} className="font-display text-lg font-bold hover:text-primary">{c.name}</Link>
              <p className="text-sm">{c.jobTitle}{c.employer && <span className="text-muted-foreground"> · {c.employer}</span>}</p></div>
            <div className="flex items-center gap-2">{jobTitle && <span className="inline-flex items-center gap-2">{score != null && row ? <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`${Math.round(score)}% match details`} className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xl font-extrabold transition hover:brightness-95 ${matchTone(score)}`}>{Math.round(score)}%<ChevronDown className={`h-5 w-5 transition-transform duration-300 ${open ? "rotate-180" : ""}`} /></button> : <MatchBadge score={score} />}<span className="text-xs text-muted-foreground">Match for {jobTitle}</span></span>}{c.availability && <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.availability === "active" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{label(AVAILABILITY, c.availability)}</span>}</div>
          </div>
          <p className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{c.location || "—"}</span><span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{c.years} yrs experience</span></p>
          {row && <div className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}><div className="overflow-hidden"><AlignmentRow r={row} />{locAlign && <div className="mt-2 flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2"><span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Location Fit</span><LocationAlignmentBadge value={locAlign} /></div>}{eduAlign && <div className="mt-2 flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2"><span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Education Fit</span><EducationAlignmentBadge value={eduAlign} /></div>}</div></div>}
          {c.headline && <p className="mt-2 text-sm font-medium">{c.headline}</p>}
          {c.summary && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.summary}</p>}
          <div className="mt-3 grid gap-2 sm:grid-cols-2"><div><p className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">Top Skills</p><Chips ids={c.skills} opts={t.skills} max={4} /></div><div><p className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">Top Technologies</p><Chips ids={c.techs} opts={t.technologies} max={4} /></div>{(c.softSkills?.length ?? 0) > 0 && <div className="sm:col-span-2"><p className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">Soft Skills</p><Chips soft ids={c.softSkills ?? []} opts={t.softSkills} max={3} /></div>}</div>
          <div className="mt-3 flex items-center gap-2 text-xs"><span className="text-muted-foreground">Profile</span><div className="h-1.5 w-28 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${c.completion}%` }} /></div><span className="font-semibold">{c.completion}%</span></div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/recruiter/candidates/$id" params={{ id: c.id }} className={primaryBtn}>View Profile</Link>
            <button onClick={() => lists.toggleSave(c.id)} aria-pressed={saved} className={`${btn} ${saved ? "border-primary text-primary" : ""}`}>{saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}{saved ? "Saved" : "Save"}</button>
            <button onClick={() => lists.toggleCompare(c.id)} aria-pressed={cmp} className={`${btn} ${cmp ? "border-primary text-primary" : ""}`}><GitCompare className="h-4 w-4" />{cmp ? "Comparing" : "Compare"}</button>
            <button onClick={soon("Talent pools")} className={btn}><UserPlus className="h-4 w-4" />Talent Pool</button>
            <button onClick={soon("Messaging")} className={btn}><MessageSquare className="h-4 w-4" />Contact</button>
          </div>
        </div>
      </div>
    </article>
  );
}

const matchTone = (s: number) => (s >= 90 ? "bg-success/15 text-success" : s >= 75 ? "bg-primary-soft text-primary" : s >= 60 ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground");
const availDot = (a: string) => (a === "active" ? "bg-success" : a === "open" ? "bg-primary" : "bg-muted-foreground");

function PhotoCover({ name, path }: { name: string; path?: string | null | undefined }) {
  const url = useAvatarUrl(path);
  const i = (name ?? "").trim().split(/\s+/).filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "?";
  return url ? <img src={url} alt={`${name} photo`} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
    : <div className="grid h-full w-full place-items-center bg-gradient-primary font-display text-5xl font-extrabold text-primary-foreground">{i}</div>;
}

export function CandidateGridCard({ c, t, lists, score }: { c: TalentRow; t: Taxonomy; lists: Lists; score?: number | undefined }) {
  const saved = lists.isSaved(c.id), cmp = lists.isCompared(c.id);
  const icon = "grid h-9 w-9 place-items-center rounded-xl border border-border bg-card hover:border-primary hover:text-primary";
  return (
    <article className={`${card} group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated @container`}>
      <Link to="/recruiter/candidates/$id" params={{ id: c.id }} className="relative block aspect-[5/4] overflow-hidden bg-muted">
        <PhotoCover name={c.name} path={c.avatarPath} />
        {score !== undefined && <span className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[11px] font-bold shadow-soft backdrop-blur whitespace-nowrap ${matchTone(score)}`}>{Math.round(score)}% Match</span>}
        {c.availability && <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-card/90 px-2 py-1 text-[10px] font-semibold shadow-soft" title={label(AVAILABILITY, c.availability)}><span className={`h-2 w-2 shrink-0 rounded-full ${availDot(c.availability)}`} /><span className="hidden @[230px]:inline">{label(AVAILABILITY, c.availability)}</span></span>}
        {c.summary && <div className="absolute inset-x-0 bottom-0 translate-y-full bg-card/95 p-3 text-xs text-muted-foreground transition-transform duration-300 group-hover:translate-y-0"><p className="line-clamp-3">{c.summary}</p>{c.employer && <p className="mt-1 font-semibold text-foreground">Recent: {c.jobTitle} · {c.employer}</p>}</div>}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link to="/recruiter/candidates/$id" params={{ id: c.id }} className="truncate font-display text-base font-bold hover:text-primary">{c.name}</Link>
        <p className="truncate text-sm">{c.jobTitle || "—"}</p>
        <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{c.location || "—"}</span><span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{c.years} yrs</span></p>
        <div className="mt-3 space-y-2"><Chips ids={c.skills} opts={t.skills} max={3} /><Chips ids={c.techs} opts={t.technologies} max={3} />{(c.softSkills?.length ?? 0) > 0 && <Chips soft ids={c.softSkills ?? []} opts={t.softSkills} max={3} />}</div>
        <div className="mt-auto flex items-center gap-1.5 pt-4">
          <Link to="/recruiter/candidates/$id" params={{ id: c.id }} className={`${primaryBtn} flex-1 justify-center px-3`}>View</Link>
          <button onClick={() => lists.toggleSave(c.id)} aria-pressed={saved} aria-label={saved ? "Unsave candidate" : "Save candidate"} title="Save" className={`${icon} ${saved ? "border-primary text-primary" : ""}`}>{saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}</button>
          <button onClick={() => lists.toggleCompare(c.id)} aria-pressed={cmp} aria-label="Compare candidate" title="Compare" className={`${icon} ${cmp ? "border-primary text-primary" : ""}`}><GitCompare className="h-4 w-4" /></button>
          <button onClick={soon("Talent pools")} aria-label="Add to talent pool" title="Talent Pool" className={icon}><UserPlus className="h-4 w-4" /></button>
          <button onClick={soon("Messaging")} aria-label="Message candidate" title="Message" className={icon}><MessageSquare className="h-4 w-4" /></button>
        </div>
      </div>
    </article>
  );
}

function useViewMode() {
  const [v, setV] = useState<"list" | "grid">("list");
  useEffect(() => { if (localStorage.getItem("talent-view") === "grid") setV("grid"); }, []);
  return [v, (n: "list" | "grid") => { setV(n); localStorage.setItem("talent-view", n); }] as const;
}

function CompareTray({ lists }: { lists: Lists }) {
  if (!lists.compareIds.length) return null;
  return <div className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-elevated"><span className="text-sm font-semibold">{lists.compareIds.length} of {CANDIDATE_COMPARE_MAX} candidates selected</span><Link to="/recruiter/candidates/compare" className={primaryBtn}>Compare</Link></div>;
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return <div className="border-t border-border py-4 first:border-0 first:pt-0"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>{children}</div>;
}
function IdToggle({ opts, value, onChange }: { opts: { id: string; name: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  return <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">{opts.map((o) => { const on = value.includes(o.id); return <button key={o.id} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== o.id) : [...value, o.id])} className={`rounded-full border px-2.5 py-1 text-xs font-medium ${on ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"}`}>{o.name}</button>; })}</div>;
}

/** Recruiter-owned companies and active jobs for the Job Context filter. */
function useJobContext(uid: string) {
  return useQuery({
    queryKey: ["job-context", uid],
    queryFn: async () => {
      const [c, j] = await Promise.all([
        supabase.from("companies").select("company_id, company_name").eq("created_by", uid).order("company_name"),
        supabase.from("jobs").select("job_id, job_title, company_id, location_country, location_state, location_city, work_arrangement, minimum_degree").eq("recruiter_id", uid).eq("job_status", "active").order("job_title"),
      ]);
      if (c.error) throw c.error;
      if (j.error) throw j.error;
      return { companies: c.data ?? [], jobs: j.data ?? [] };
    },
  });
}

function AlignmentRow({ r }: { r: ScoreRow }) {
  const items: [string, number][] = [["Languages", r.language_alignment_score], ["Skills", r.skill_alignment_score], ["Tools & Tech", r.technology_alignment_score], ["Experience", r.experience_alignment_score], ["Preferences", r.preference_alignment_score]];
  return <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-xl bg-muted/50 p-3 sm:grid-cols-5">{items.map(([l, v]) => <div key={l}><div className="flex justify-between text-[11px]"><span className="text-muted-foreground">{l}</span><span className="font-semibold">{Math.round(Number(v))}%</span></div><div className="mt-1 h-1 rounded-full bg-muted"><div className="h-1 rounded-full bg-gradient-primary" style={{ width: `${Number(v)}%` }} /></div></div>)}</div>;
}

export function TalentSearchPage({ uid, f: raw }: { uid: string; f: TalentFilters }) {
  const navigate = useNavigate();
  const tax = useTaxonomy();
  const q = useQuery({ queryKey: ["talent"], queryFn: listTalent });
  const lists = useCandidateLists(uid);
  useAutoRecalc();
  const ctx = useJobContext(uid);
  const selJob = ctx.data?.jobs.find((j) => j.job_id === raw.job);
  const hasJob = !!selJob;
  const selCo = ctx.data?.companies.find((c) => c.company_id === (raw.co || selJob?.company_id));
  const f: TalentFilters = { ...raw, sort: effectiveTalentSort(raw.sort, hasJob), mm: hasJob ? raw.mm : 0 };
  const scoreQ = useScores({ jobIds: selJob ? [selJob.job_id] : [] });
  const rowsBy = useMemo(() => { const m: Record<string, ScoreRow> = {}; for (const r of scoreQ.data ?? []) m[r.candidate_id] = r; return m; }, [scoreQ.data]);
  const best = useMemo(() => { const m: Record<string, number> = {}; for (const [k, r] of Object.entries(rowsBy)) m[k] = Number(r.overall_match_score); return m; }, [rowsBy]);
  const [kw, setKw] = useState(f.q);
  const [open, setOpen] = useState(false);
  const [view, setView] = useViewMode();
  const [hidden, setHidden] = useFiltersHidden("talent-filters-hidden");
  const [fw, setFw] = usePanelWidth("sundance.talentFiltersWidth", 300, 240, 440);
  const set = (p: Partial<TalentFilters>) => navigate({ to: "/recruiter/candidates", search: { ...f, page: 1, ...p } });

  const results = useMemo(() => {
    if (!q.data || !tax.data) return [];
    const low = f.q.trim().toLowerCase();
    const t = tax.data;
    const kwIds = low ? [...t.languages, ...t.skills, ...t.technologies, ...t.roles].filter((o) => o.name.toLowerCase().includes(low) || low.includes(o.name.toLowerCase())).map((o) => o.id) : [];
    const filtered = q.data.filter((c) => matchesTalent(c, f, kwIds) && meetsMinMatch(best[c.id], f.mm));
    if (hasJob && isMatchSort(f.sort)) { const dir = f.sort === "match_low" ? -1 : 1; return [...filtered].sort((a, b) => dir * ((best[b.id] ?? -1) - (best[a.id] ?? -1))); }
    return sortTalent(filtered, f.sort, f.q);
  }, [q.data, tax.data, f, best, hasJob]);

  if (q.error || tax.error) return <ErrorBox msg={friendlyError(q.error ?? tax.error, "Unable to load candidates.")} retry={() => { q.refetch(); tax.refetch(); }} />;
  const t = tax.data;
  const pages = Math.max(1, Math.ceil(results.length / TALENT_PAGE_SIZE));
  const page = Math.min(f.page, pages);
  const shown = results.slice((page - 1) * TALENT_PAGE_SIZE, page * TALENT_PAGE_SIZE);
  const count = talentFilterCount(f);

  const filters = t && (
    <div className={`${card} p-5`}>
      <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-1.5"><p className="font-display font-bold">Filters</p><PanelToggleButton open label="filters" onClick={() => setHidden(true)} className="hidden lg:inline-flex" /></div>{count > 0 && <button onClick={() => navigate({ to: "/recruiter/candidates", search: { ...DEFAULT_TALENT, q: f.q } })} className="text-xs font-semibold text-primary">Clear all ({count})</button>}</div>
      <div className="mb-4 rounded-xl border border-primary/30 bg-primary-soft/40 p-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary"><Sparkles className="h-3.5 w-3.5" />Job Context</p>
        <label className="text-xs font-semibold text-muted-foreground">Company</label>
        <select aria-label="Company" value={raw.co ?? ""} onChange={(e) => set({ co: e.target.value, job: "" })} className={`${inputCls} mt-1`}><option value="">All my companies</option>{ctx.data?.companies.map((c) => <option key={c.company_id} value={c.company_id}>{c.company_name}</option>)}</select>
        <label className="mt-2 block text-xs font-semibold text-muted-foreground">Job</label>
        <select aria-label="Job" value={selJob?.job_id ?? ""} onChange={(e) => { const j = ctx.data?.jobs.find((x) => x.job_id === e.target.value); set({ job: e.target.value, co: j?.company_id ?? raw.co ?? "", sort: "match" }); }} className={`${inputCls} mt-1`}><option value="">Select Job</option>{ctx.data?.jobs.filter((j) => !raw.co || j.company_id === raw.co).map((j) => <option key={j.job_id} value={j.job_id}>{j.job_title}</option>)}</select>
        {ctx.data && !ctx.data.jobs.length && <p className="mt-2 text-xs text-muted-foreground">You have no active jobs yet. <Link to="/recruiter/jobs/create" className="font-semibold text-primary">Post a job</Link> to see match scores.</p>}
        {!hasJob && <p className="mt-2 text-[11px] text-muted-foreground">Select a job to see match scores and rankings.</p>}
      </div>
      {hasJob && <Group title="Match Score"><MatchFilter value={f.mm} onChange={(mm) => set({ mm })} /></Group>}
      <Group title="Current Role"><SearchPicker ariaLabel="Role filter" grouped options={t.roles} value={f.role} onChange={(v) => set({ role: v })} placeholder="Search role" emptyLabel="Any role" /></Group>
      <Group title="Current Level"><SearchPicker ariaLabel="Level filter" options={t.levels} value={f.level ?? ""} onChange={(v) => set({ level: v })} placeholder="Search level" emptyLabel="Any level" /></Group>
      <Group title="Programming Languages"><IdToggle opts={t.languages} value={f.langs} onChange={(v) => set({ langs: v })} /></Group>
      <Group title="Technical Skills"><IdToggle opts={t.skills} value={f.skills} onChange={(v) => set({ skills: v })} /></Group>
      <Group title="Soft Skills"><IdToggle opts={t.softSkills} value={f.soft ?? []} onChange={(v) => set({ soft: v })} /></Group>
      <Group title="Technologies"><IdToggle opts={t.technologies} value={f.techs} onChange={(v) => set({ techs: v })} /></Group>
      <Group title="Years Of Experience"><div className="flex flex-wrap gap-1.5">{EXPERIENCE_BUCKETS.map(([k, l]) => <button key={k} onClick={() => set({ exp: f.exp === k ? "" : k })} aria-pressed={f.exp === k} className={`rounded-full border px-2.5 py-1 text-xs font-medium ${f.exp === k ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{l}</button>)}</div></Group>
      <Group title="Education"><div className="space-y-2"><select aria-label="Minimum degree" className={inputCls} value={f.deg ?? ""} onChange={(e) => set({ deg: e.target.value })}><option value="">Any degree</option>{DEGREE_TYPES.map((d) => <option key={d} value={d}>{d}+</option>)}</select><input aria-label="Field of study" className={inputCls} defaultValue={f.fos ?? ""} placeholder="Field of study, e.g. Computer Science" onBlur={(e) => set({ fos: e.target.value.trim() })} onKeyDown={(e) => { if (e.key === "Enter") set({ fos: (e.target as HTMLInputElement).value.trim() }); }} /><input aria-label="Graduated after" inputMode="numeric" maxLength={4} className={inputCls} defaultValue={f.grad ?? ""} placeholder="Graduated after (year)" onBlur={(e) => { const v = e.target.value; set({ grad: /^\d{4}$/.test(v) ? Number(v) : undefined }); }} /></div></Group>
      <Group title="Availability"><MultiToggle options={AVAILABILITY.map(([, l]) => l)} value={f.avail.map((a) => label(AVAILABILITY, a))} onChange={(v) => set({ avail: AVAILABILITY.filter(([, l]) => v.includes(l)).map(([k]) => k) })} /></Group>
      <Group title="Location"><LocationFilter country={f.country ?? ""} state={f.state ?? ""} city={f.city ?? ""} onChange={(v) => set({ ...v, loc: "" })} /><label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.remote} onChange={(e) => set({ remote: e.target.checked })} />Remote only</label></Group>
      <Group title="Salary Expectations"><div className="grid grid-cols-2 gap-2"><input type="number" min={0} step={5000} value={f.smin || ""} onChange={(e) => set({ smin: Number(e.target.value) || 0 })} placeholder="Min" className={inputCls} /><input type="number" min={0} step={5000} value={f.smax || ""} onChange={(e) => set({ smax: Number(e.target.value) || 0 })} placeholder="Max" className={inputCls} /></div>
        <input type="range" min={0} max={400000} step={10000} value={f.smax || 400000} onChange={(e) => set({ smax: Number(e.target.value) >= 400000 ? 0 : Number(e.target.value) })} className="mt-3 w-full accent-primary" aria-label="Maximum salary" /><p className="text-xs text-muted-foreground">Up to {f.smax ? `$${(f.smax / 1000).toFixed(0)}k` : "any"}</p></Group>
      <Group title="Work Arrangement"><MultiToggle options={ARRANGEMENTS.map(([, l]) => l)} value={f.arr.map((a) => label(ARRANGEMENTS, a))} onChange={(v) => set({ arr: ARRANGEMENTS.filter(([, l]) => v.includes(l)).map(([k]) => k) })} /></Group>
      <Group title="Industry Experience"><MultiToggle options={TALENT_INDUSTRIES} value={f.ind} onChange={(v) => set({ ind: v })} /></Group>
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-2xl font-extrabold sm:text-3xl">Search Talent</h1><p className="text-sm text-muted-foreground">Discover qualified candidates by skills, technologies and experience.</p></div>
        <div className="flex gap-2"><Link to="/recruiter/candidates/saved" className={btn}><Bookmark className="h-4 w-4" />Saved ({lists.savedIds.length})</Link><Link to="/recruiter/candidates/compare" className={btn}><GitCompare className="h-4 w-4" />Compare ({lists.compareIds.length})</Link></div>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); set({ q: kw.trim().slice(0, 80) }); }} className={`${card} flex gap-2 p-2`}>
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="Name, role, skill, technology, employer…" aria-label="Search candidates" className="w-full rounded-xl bg-transparent py-2.5 pl-9 pr-3 text-sm outline-none" /></div>
        <button className={primaryBtn}>Search</button>
        <button type="button" onClick={() => setOpen(true)} className={`${btn} lg:hidden`}><SlidersHorizontal className="h-4 w-4" />{count || ""}</button>
      </form>
      <div className="grid gap-6 lg:flex lg:gap-0">
        {hidden ? <PanelReveal label="filters" onShow={() => setHidden(false)} className="relative mr-3" />
          : <aside className="relative hidden shrink-0 lg:mr-6 lg:block" style={{ width: fw }}>{filters}<PanelSeparator label="filters" width={fw} setWidth={setFw} min={240} max={440} onHide={() => setHidden(true)} className="-right-5" /></aside>}
        {open && <div className="fixed inset-0 z-40 overflow-y-auto bg-background p-4 lg:hidden"><div className="mb-3 flex justify-between"><p className="font-display text-lg font-bold">Filters</p><button onClick={() => setOpen(false)} aria-label="Close filters"><X className="h-5 w-5" /></button></div>{filters}<button onClick={() => setOpen(false)} className={`${primaryBtn} mt-4 w-full justify-center`}>Show {results.length} candidates</button></div>}
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-3">{hidden && <PanelShowButton label="Show Filters" count={count} onClick={() => setHidden(false)} className="hidden lg:inline-flex" />}<p className="text-sm text-muted-foreground">{q.isLoading ? "Searching…" : `${results.length} candidate${results.length === 1 ? "" : "s"} found`}</p></div>
            <div className="flex items-center gap-2">
              <div role="group" aria-label="Results view" className="inline-flex rounded-xl border border-input p-0.5">
                {(["list", "grid"] as const).map((m) => <button key={m} type="button" aria-pressed={view === m} onClick={() => setView(m)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${view === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary"}`}>{m === "list" ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}<span className="hidden sm:inline">{m === "list" ? "List View" : "Grid View"}</span></button>)}
              </div>
              <select value={f.sort} onChange={(e) => set({ sort: e.target.value })} aria-label="Sort" className="rounded-xl border border-input bg-background px-3 py-2 text-sm">{talentSortOptions(hasJob).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            </div></div>
{hasJob ? <div className={`${card} flex flex-wrap items-center gap-3 border-primary/40 bg-primary-soft/40 p-4`}><Sparkles className="h-5 w-5 text-primary" /><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase text-muted-foreground">Matching Candidates For</p><p className="font-display text-lg font-bold">{selJob.job_title}</p>{selCo && <p className="text-sm text-muted-foreground">{selCo.company_name}</p>}</div><button type="button" onClick={() => set({ job: "", mm: 0 })} className={btn}><X className="h-4 w-4" />Clear Job</button></div>
            : <div className={`${card} p-3 text-sm text-muted-foreground`}><span className="font-semibold text-foreground">General Talent Search</span> — select a job under Job Context to see match scores.</div>}
{q.error || tax.error ? <ErrorBox msg="Unable To Load Candidates" retry={() => { void tax.refetch(); void q.refetch(); }} /> : q.isLoading || !t ? <div className={view === "grid" ? "grid gap-4 sm:grid-cols-2 3xl:grid-cols-3" : "space-y-4"}>{[0, 1, 2, 3].map((i) => <div key={i} className={`${card} ${view === "grid" ? "h-96" : "h-48"} animate-pulse`} />)}</div>
            : shown.length === 0 ? <div className={`${card} p-10 text-center`}><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary-soft text-primary"><Search className="h-7 w-7" /></div><p className="mt-4 font-display text-lg font-bold">No Candidates Match Current Filters</p><p className="mt-1 text-sm text-muted-foreground">Try removing filters or broadening your keyword.</p>
                <div className="mt-5 flex justify-center gap-2"><button onClick={() => navigate({ to: "/recruiter/candidates", search: { ...DEFAULT_TALENT, q: f.q } })} className={primaryBtn}>Clear Filters</button><button onClick={() => { setKw(""); navigate({ to: "/recruiter/candidates", search: DEFAULT_TALENT }); }} className={btn}>Return To Search</button></div></div>
            : view === "grid" ? <div className="grid gap-4 sm:grid-cols-2 3xl:grid-cols-3">{shown.map((c) => <CandidateGridCard key={c.id} c={c} t={t} lists={lists} score={hasJob ? best[c.id] : undefined} />)}</div>
            : shown.map((c) => <CandidateCard key={c.id} c={c} t={t} lists={lists} score={hasJob ? best[c.id] : undefined} jobTitle={selJob?.job_title} row={rowsBy[c.id]} locAlign={selJob ? locationAlignment({ country: c.country ?? "", state: c.state ?? "", city: c.city ?? "" }, { country: selJob.location_country ?? "", state: selJob.location_state ?? "", city: selJob.location_city ?? "" }, selJob.work_arrangement, c.arrangement) : undefined} eduAlign={selJob ? educationAlignment(c.education ?? [], selJob.minimum_degree) : undefined} />)}
          {pages > 1 && <div className="flex items-center justify-center gap-2"><button disabled={page <= 1} onClick={() => set({ page: page - 1 })} className={`${btn} disabled:opacity-40`}>Previous</button><span className="text-sm">Page {page} of {pages}</span><button disabled={page >= pages} onClick={() => set({ page: page + 1 })} className={`${btn} disabled:opacity-40`}>Next</button></div>}
        </div>
      </div>
      <CompareTray lists={lists} />
    </div>
  );
}

const prof = (rows: { lookup_id: string; proficiency_level: string; years_experience: number }[], opts: { id: string; name: string }[]) =>
  rows.length ? <div className="flex flex-wrap gap-1.5">{rows.map((r) => <span key={r.lookup_id} className="rounded-full border border-border px-3 py-1 text-xs"><strong className="font-semibold">{nameOf(opts, r.lookup_id)}</strong> · {cap(r.proficiency_level)}{r.years_experience ? ` · ${r.years_experience}y` : ""}</span>)}</div> : <span className="text-sm text-muted-foreground">—</span>;

/** Full recruiter-facing profile body (used by talent profile and application review). */
export function CandidateProfileBody({ d, t, aside }: { d: CandidateFull; t: Taxonomy; aside?: ReactNode }) {
  const p = d.profile;
  const [busy, setBusy] = useState(false);
  async function download() { if (!p.resume_path) return; setBusy(true); try { window.open(await resumeUrl(p.resume_path, p.resume_file_name), "_blank", "noopener"); } catch (e) { toast.error(friendlyError(e, "Resume not available.")); } setBusy(false); }
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="min-w-0 space-y-6">
        <div className={`${card} p-6`}><h2 className="font-display text-lg font-bold">Professional Overview</h2>
          {p.headline && <p className="mt-3 font-medium">{p.headline}</p>}{p.summary && <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{p.summary}</p>}
          <dl className="mt-4 grid gap-4 sm:grid-cols-3"><Item k="Current Role" v={p.job_title} /><Item k="Years Experience" v={`${p.years_experience}`} /><Item k="Industry Experience" v={p.industry_experience.join(", ")} /></dl></div>
        <div className={`${card} p-6`}><h2 className="font-display text-lg font-bold">Work Experience</h2>
          {d.experience.length ? <ol className="mt-4 space-y-5">{d.experience.map((e) => <li key={e.experience_id} className="border-l-2 border-primary/30 pl-4"><p className="font-semibold">{e.job_title} · {e.company_name}</p><p className="text-xs text-muted-foreground">{[e.location, e.industry, `${e.start_date ?? "?"} – ${e.current_position ? "Present" : e.end_date ?? "?"}`].filter(Boolean).join(" · ")}</p>{e.responsibilities && <p className="mt-2 whitespace-pre-line text-sm">{e.responsibilities}</p>}{e.achievements && <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{e.achievements}</p>}{e.technologies_used.length > 0 && <p className="mt-1 text-xs">Tech: {e.technologies_used.join(", ")}</p>}</li>)}</ol> : <p className="mt-2 text-sm text-muted-foreground">No experience listed.</p>}</div>
        <div className={`${card} p-6`}><h2 className="mb-4 font-display text-lg font-bold">Projects</h2><ProjectList items={d.projects ?? []} /></div>
        <div className={`${card} flex flex-wrap items-center justify-between gap-3 p-6`}><div><h2 className="font-display text-lg font-bold">Resume</h2><p className="text-sm text-muted-foreground">{p.resume_file_name ?? "No resume uploaded"}</p></div>{p.resume_path && <button onClick={download} disabled={busy} className={btn}><Download className="h-4 w-4" />Download</button>}</div>
      </div>
      <div className="min-w-0 space-y-6">
        {aside}
        <div className={`${card} space-y-5 p-6`}><h2 className="font-display text-lg font-bold">Skills & Technologies</h2>
          <Item k="Programming Languages" v={prof(d.languages, t.languages)} /><Item k="Technical Skills" v={prof(d.skills, t.skills)} /><Item k="Technologies" v={prof(d.technologies, t.technologies)} /><Item k="Soft Skills" v={<Chips soft ids={d.softSkills} opts={t.softSkills} max={50} />} /></div>
        <div className={`${card} p-6`}><h2 className="font-display text-lg font-bold">Education</h2>{d.education.length ? <ul className="mt-3 space-y-3">{d.education.map((e) => <li key={e.education_id}><EducationLines e={e} /></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">—</p>}</div>
        <div className={`${card} p-6`}><h2 className="font-display text-lg font-bold">Certifications</h2>{d.certifications.length ? <ul className="mt-3 space-y-3">{d.certifications.map((c) => <li key={c.certification_id}><p className="font-semibold">{c.certification_name}</p><p className="text-xs text-muted-foreground">{c.issuing_organization}{c.issue_date && ` · ${c.issue_date}`}</p></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">—</p>}</div>
        <div className={`${card} p-6`}><h2 className="font-display text-lg font-bold">Career Preferences</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2"><Item k="Target Roles" v={p.target_roles.join(", ")} /><Item k="Desired Minimum Salary" v={formatSalaryAmount(p.salary_amount, p.salary_currency)} /><Item k="Work Arrangement" v={label(ARRANGEMENTS, p.work_arrangement)} /><Item k="Availability" v={label(AVAILABILITY, p.availability)} /><Item k="Locations Of Interest" v={p.locations_of_interest.join(", ")} /><Item k="Target Industries" v={p.target_industries.join(", ")} /></dl></div>
      </div>
    </div>
  );
}

export function ProfileHeader({ d, actions }: { d: CandidateFull; actions?: ReactNode }) {
  const p = d.profile;
  return (
    <div className={`${card} p-6`}>
      <div className="flex flex-wrap items-start gap-4"><Avatar name={d.name} path={d.avatarPath} size="h-16 w-16 text-xl" />
        <div className="min-w-0 flex-1"><h1 className="font-display text-2xl font-extrabold">{d.name}</h1><p>{p.job_title}{p.current_employer && <span className="text-muted-foreground"> · {p.current_employer}</span>}</p>
          <p className="mt-1 flex flex-wrap gap-x-4 text-sm text-muted-foreground"><span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{p.location || "—"}</span><span>{p.years_experience} yrs experience</span><span>{label(AVAILABILITY, p.availability)}</span></p>
          <div className="mt-3"><LinkBadges p={p} /></div>
          <div className="mt-3 flex items-center gap-2 text-xs"><span className="text-muted-foreground">Profile Completion</span><div className="h-1.5 w-32 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${d.completion}%` }} /></div><span className="font-semibold">{d.completion}%</span></div></div></div>
      {actions && <div className="mt-5 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function RecruiterCandidatePage({ uid, id }: { uid: string; id: string }) {
  const tax = useTaxonomy();
  const q = useQuery({ queryKey: ["candidate-full", id], queryFn: () => loadCandidateFull(id) });
  const lists = useCandidateLists(uid);
  useEffect(() => { if (q.data) track("candidate_view", id); }, [q.data, id]);
  if (q.isLoading || tax.isLoading) return <div className={`${card} h-96 animate-pulse`} />;
  if (q.error || tax.error) return <ErrorBox msg={friendlyError(q.error ?? tax.error, "Unable to load this candidate.")} retry={() => { q.refetch(); tax.refetch(); }} />;
  if (!q.data || !tax.data) return <div className={`${card} mx-auto max-w-xl p-10 text-center`}><p className="font-display text-lg font-bold">Profile not available</p><p className="mt-1 text-sm text-muted-foreground">This candidate is private or no longer on Sundance Professionals.</p><Link to="/recruiter/candidates" className={`${primaryBtn} mt-4`}>Back to search</Link></div>;
  const saved = lists.isSaved(id), cmp = lists.isCompared(id);
  return (
    <div className="space-y-6 pb-16">
      <Link to="/recruiter/candidates" className="text-sm text-muted-foreground hover:text-primary">← Back to search</Link>
      <ProfileHeader d={q.data} actions={<>
        <button onClick={() => lists.toggleSave(id)} className={`${btn} ${saved ? "border-primary text-primary" : ""}`}>{saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}{saved ? "Saved" : "Save Candidate"}</button>
        <button onClick={() => lists.toggleCompare(id)} className={`${btn} ${cmp ? "border-primary text-primary" : ""}`}><GitCompare className="h-4 w-4" />{cmp ? "Comparing" : "Compare Candidate"}</button>
        <MessageButton role="recruiter" candidateId={id} className={btn} />
        <ReportButton type="user" targetId={id} /></>} />
      <CandidateProfileBody d={q.data} t={tax.data} aside={<MatchPlaceholder />} />
    </div>
  );
}

export function SavedCandidatesPage({ uid }: { uid: string }) {
  const lists = useCandidateLists(uid);
  const tax = useTaxonomy();
  const key = lists.savedIds.join(",");
  const q = useQuery({ queryKey: ["talent-ids", key], queryFn: () => talentByIds(lists.savedIds) });
  return (
    <div className="space-y-6 pb-20">
      <Link to="/recruiter/candidates" className="text-sm text-muted-foreground hover:text-primary">← Back to search</Link>
      <h1 className="font-display text-2xl font-extrabold">Saved Candidates</h1>
      {q.error ? <ErrorBox msg="Unable to load saved candidates." retry={() => q.refetch()} /> : q.isLoading || !tax.data ? <div className={`${card} h-48 animate-pulse`} />
        : !q.data?.length ? <div className={`${card} p-10 text-center`}><p className="font-display text-lg font-bold">No saved candidates yet</p><Link to="/recruiter/candidates" className={`${primaryBtn} mt-4`}>Search talent</Link></div>
        : <div className="space-y-4">{q.data.map((c) => <CandidateCard key={c.id} c={c} t={tax.data} lists={lists} />)}</div>}
      <CompareTray lists={lists} />
    </div>
  );
}

export function CompareCandidatesPage({ uid }: { uid: string }) {
  const lists = useCandidateLists(uid);
  useAutoRecalc();
  const ctx = useJobContext(uid);
  const [co, setCo] = useState("");
  const [jobSel, setJobSel] = useState("");
  const selJob = ctx.data?.jobs.find((j) => j.job_id === jobSel);
  const scoreQ = useScores(selJob ? { jobIds: [selJob.job_id] } : {});
  const bestRow = (id: string) => (scoreQ.data ?? []).filter((r) => r.candidate_id === id).sort((a, b) => Number(b.overall_match_score) - Number(a.overall_match_score))[0];
  const pct = (id: string, k: "language_alignment_score" | "skill_alignment_score" | "technology_alignment_score" | "experience_alignment_score" | "preference_alignment_score") => { const r = bestRow(id); return r ? `${Math.round(Number(r[k]))}%` : "—"; };
  const det = (id: string) => (bestRow(id)?.details ?? {}) as { strengths?: string[]; missing?: { languages?: string[]; skills?: string[]; technologies?: string[] } };
  const tax = useTaxonomy();
  const key = lists.compareIds.join(",");
  const q = useQuery({ queryKey: ["talent-ids", key], queryFn: () => talentByIds(lists.compareIds) });
  const t = tax.data;
  const cands = q.data ?? [];
  const scoreOf = (id: string) => { const r = bestRow(id); return r ? Number(r.overall_match_score) : null; };
  const { top, ranks, lead } = rankCompare(cands.map((c) => ({ id: c.id, score: scoreOf(c.id), tie: c.years })));
  const topC = top ? cands.find((c) => c.id === top.id) : undefined;
  const num = (id: string, k: Parameters<typeof pct>[1]) => { const r = bestRow(id); return r ? Number(r[k]) : null; };
  const best: Record<string, string | null> = cands.length > 1 ? {
    "Overall Match": top?.id ?? null,
    Experience: bestBy(cands, (c) => c.id, (c) => c.years),
    "Language Score": bestBy(cands, (c) => c.id, (c) => num(c.id, "language_alignment_score")),
    "Skill Score": bestBy(cands, (c) => c.id, (c) => num(c.id, "skill_alignment_score")),
    "Technology Score": bestBy(cands, (c) => c.id, (c) => num(c.id, "technology_alignment_score")),
    "Experience Score": bestBy(cands, (c) => c.id, (c) => num(c.id, "experience_alignment_score")),
  } : {};
  const scope = selJob ? `for ${selJob.job_title}` : "best across your jobs";
  const rows: [string, (c: TalentRow) => ReactNode][] = t ? [
    ["Overall Match", (c) => { const r = bestRow(c.id); return r ? <span className="inline-flex flex-col gap-0.5"><MatchBadge score={r.overall_match_score} showLabel /><span className="text-[11px] text-muted-foreground">{scope}</span></span> : <MatchBadge score={null} />; }],
    ["Current Role", (c) => c.jobTitle], ["Employer", (c) => c.employer], ["Location", (c) => c.location], ["Experience", (c) => `${c.years} yrs`],
    ["Availability", (c) => label(AVAILABILITY, c.availability)], ["Work Arrangement", (c) => label(ARRANGEMENTS, c.arrangement)], ["Desired Minimum Salary", (c) => c.salary],
    ["Languages", (c) => <Chips ids={c.langs} opts={t.languages} max={8} />], ["Skills", (c) => <Chips ids={c.skills} opts={t.skills} max={8} />], ["Technologies", (c) => <Chips ids={c.techs} opts={t.technologies} max={8} />],
    ["Language Score", (c) => pct(c.id, "language_alignment_score")], ["Skill Score", (c) => pct(c.id, "skill_alignment_score")],
    ["Technology Score", (c) => pct(c.id, "technology_alignment_score")], ["Experience Score", (c) => pct(c.id, "experience_alignment_score")], ["Preference Score", (c) => pct(c.id, "preference_alignment_score")],
    ["Strengths", (c) => <ul className="space-y-0.5 text-xs">{(det(c.id).strengths ?? []).slice(0, 4).map((x) => <li key={x}>✓ {x}</li>)}</ul>],
    ["Gaps", (c) => { const m = det(c.id).missing ?? {}; const all = [...(m.languages ?? []), ...(m.skills ?? []), ...(m.technologies ?? [])]; return all.length ? <ul className="space-y-0.5 text-xs">{all.slice(0, 4).map((x) => <li key={x}>• Missing {x}</li>)}</ul> : null; }],
    ["Profile Completion", (c) => `${c.completion}%`],
  ] : [];
  const companies = (ctx.data?.companies ?? []).map((c) => ({ value: c.company_id, label: c.company_name }));
  const coName = (id: string | null) => ctx.data?.companies.find((c) => c.company_id === id)?.company_name ?? "";
  const jobOpts = (ctx.data?.jobs ?? []).filter((j) => !co || j.company_id === co).map((j) => ({ value: j.job_id, label: co ? j.job_title : `${j.job_title} — ${coName(j.company_id)}` }));
  const hl = (id: string) => (top?.id === id && cands.length > 1 ? "bg-primary-soft/40" : "");
  return (
    <div className="space-y-6 pb-16">
      <Link to="/recruiter/candidates" className="text-sm text-muted-foreground hover:text-primary">← Back to search</Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-2xl font-extrabold">Compare Candidates</h1><p className="text-sm text-muted-foreground">{selJob ? `Scored against ${selJob.job_title}.` : "Pick a job to compare candidates for that role."}</p></div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <SearchSelect ariaLabel="Filter by company" className="sm:w-52" value={co} onChange={(v) => { setCo(v); setJobSel(""); }} allLabel="All companies" placeholder="Search companies..." options={companies} />
          <SearchSelect ariaLabel="Filter by job" className="sm:w-64" value={jobSel} onChange={(v) => { setJobSel(v); const j = ctx.data?.jobs.find((x) => x.job_id === v); if (j) setCo(j.company_id ?? ""); }} allLabel="All jobs" placeholder="Search job titles..." options={jobOpts} />
        </div>
      </div>
      {q.error ? <ErrorBox msg="Unable to load comparison." retry={() => q.refetch()} /> : q.isLoading || !t ? <div className={`${card} h-48 animate-pulse`} />
        : cands.length < 2 ? <div className={`${card} p-10 text-center`}><GitCompare className="mx-auto h-8 w-8 text-primary" /><p className="mt-3 font-display text-lg font-bold">Select at least 2 candidates to compare</p><p className="mt-1 text-sm text-muted-foreground">You can compare up to {CANDIDATE_COMPARE_MAX}.</p>{cands.map((c) => <button key={c.id} onClick={() => lists.toggleCompare(c.id)} className={`${btn} mt-3`}>Remove {c.name}</button>)}<Link to="/recruiter/candidates" className={`${primaryBtn} ml-2 mt-4`}>Search talent</Link></div>
        : <>
          {top && topC ? <AiTopPick title={topC.name} subtitle={[topC.jobTitle, `${topC.years} yrs experience`].filter(Boolean).join(" · ")} score={Number(top.score)} lead={lead}
            media={<Avatar name={topC.name} path={topC.avatarPath} size="h-10 w-10 text-sm" />} context={`strongest of ${cands.length} candidates ${scope}`} reasons={det(top.id).strengths ?? []} />
            : <div className={`${card} flex items-center gap-2 border-dashed p-4 text-sm text-muted-foreground`}><Sparkles className="h-4 w-4 text-primary" />No match scores yet {scope} — the AI top pick appears once scores are ready.</div>}
          <div className={`${card} overflow-x-auto`}><table className="w-full min-w-[640px] border-collapse text-sm"><thead><tr>{cands.map((c, i) => <th key={c.id} className={`min-w-[200px] ${i > 0 ? "border-l border-border" : ""} p-4 text-left align-top font-normal ${hl(c.id)}`}><div className="flex items-start justify-between gap-2"><Avatar name={c.name} path={c.avatarPath} size="h-10 w-10 text-sm" /><button onClick={() => lists.toggleCompare(c.id)} aria-label="Remove from comparison" className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-destructive"><X className="h-4 w-4" /></button></div><Link to="/recruiter/candidates/$id" params={{ id: c.id }} className="mt-2 block font-display font-bold hover:text-primary">{c.name}</Link><RankPill rank={ranks[c.id]} score={scoreOf(c.id)} /></th>)}</tr></thead>
            <tbody>{rows.map(([l, fn]) => <tr key={l} className="border-t border-border">{cands.map((c, i) => <td key={c.id} className={`${i > 0 ? "border-l border-border" : ""} p-4 align-top ${hl(c.id)}`}><div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{l}</div>{fn(c) || "—"}{best[l] === c.id && <BestTag />}</td>)}</tr>)}</tbody></table></div>
        </>}
    </div>
  );
}
