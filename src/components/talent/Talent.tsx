import { LinkBadges, ProjectList } from "@/components/profile/links-projects";
import { track } from "@/lib/track";
import { useAvatarUrl } from "@/components/app/ProfilePhoto";
import { MessageButton } from "@/components/messages/Messages";
import { MatchBadge, MatchFilter, useAutoRecalc, useScores } from "@/components/match/Match";
import { meetsMinMatch } from "@/lib/match-engine";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck, Briefcase, Download, GitCompare, LayoutGrid, List, MapPin, MessageSquare, Search, SlidersHorizontal, Sparkles, UserPlus, X } from "lucide-react";
import { loadTaxonomy, type Taxonomy } from "@/lib/jobs-data";
import { listComparedCandidates, listSavedCandidates, listTalent, loadCandidateFull, resumeUrl, setComparedCandidate, setSavedCandidate, talentByIds, type CandidateFull } from "@/lib/talent-data";
import { CANDIDATE_COMPARE_MAX, DEFAULT_TALENT, EXPERIENCE_BUCKETS, TALENT_INDUSTRIES, TALENT_PAGE_SIZE, TALENT_SORTS, matchesTalent, sortTalent, talentFilterCount, type TalentFilters, type TalentRow } from "@/lib/talent-rules";
import { ARRANGEMENTS, AVAILABILITY, card, cap, friendlyError, inputCls, label } from "@/components/profile/parts";
import { Item, MultiToggle } from "@/components/recruiter/shared";

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

export function Avatar({ name, size = "h-12 w-12 text-base", path }: { name: string; size?: string; path?: string | null | undefined }) {
  const url = useAvatarUrl(path);
  const i = name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "?";
  return <div className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-primary font-display font-bold text-primary-foreground ${size}`}>{url ? <img src={url} alt={`${name} photo`} className="h-full w-full object-cover" /> : i}</div>;
}
export function Chips({ ids, opts, max = 5, soft = false }: { ids: string[]; opts: { id: string; name: string }[]; max?: number; soft?: boolean }) {
  if (!ids.length) return <span className="text-xs text-muted-foreground">—</span>;
  return <div className="flex flex-wrap gap-1.5">{ids.slice(0, max).map((id) => <span key={id} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${soft ? "bg-indigo/10 text-indigo" : "bg-primary-soft text-primary"}`}>{nameOf(opts, id)}</span>)}{ids.length > max && <span className="text-xs text-muted-foreground">+{ids.length - max}</span>}</div>;
}
export function ErrorBox({ msg, retry }: { msg: string; retry: () => void }) {
  return <div className={`${card} p-8 text-center`}><p className="font-semibold">{msg}</p><button onClick={retry} className={`${primaryBtn} mt-4`}>Try again</button></div>;
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

export function CandidateCard({ c, t, lists, score }: { c: TalentRow; t: Taxonomy; lists: Lists; score?: number | undefined }) {
  const saved = lists.isSaved(c.id), cmp = lists.isCompared(c.id);
  return (
    <article className={`${card} p-5`}>
      <div className="flex gap-4">
        <Avatar name={c.name} path={c.avatarPath} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0"><Link to="/recruiter/candidates/$id" params={{ id: c.id }} className="font-display text-lg font-bold hover:text-primary">{c.name}</Link>
              <p className="text-sm">{c.jobTitle}{c.employer && <span className="text-muted-foreground"> · {c.employer}</span>}</p></div>
            <div className="flex items-center gap-2"><MatchBadge score={score} />{c.availability && <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.availability === "active" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{label(AVAILABILITY, c.availability)}</span>}</div>
          </div>
          <p className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{c.location || "—"}</span><span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{c.years} yrs experience</span></p>
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
  const i = name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "?";
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

export function TalentSearchPage({ uid, f }: { uid: string; f: TalentFilters }) {
  const navigate = useNavigate();
  const tax = useTaxonomy();
  const q = useQuery({ queryKey: ["talent"], queryFn: listTalent });
  const lists = useCandidateLists(uid);
  useAutoRecalc();
  const best = useBestScores();
  const [kw, setKw] = useState(f.q);
  const [open, setOpen] = useState(false);
  const [view, setView] = useViewMode();
  const set = (p: Partial<TalentFilters>) => navigate({ to: "/recruiter/candidates", search: { ...f, page: 1, ...p } });

  const results = useMemo(() => {
    if (!q.data || !tax.data) return [];
    const low = f.q.trim().toLowerCase();
    const t = tax.data;
    const kwIds = low ? [...t.languages, ...t.skills, ...t.technologies, ...t.roles].filter((o) => o.name.toLowerCase().includes(low) || low.includes(o.name.toLowerCase())).map((o) => o.id) : [];
    const filtered = q.data.filter((c) => matchesTalent(c, f, kwIds) && meetsMinMatch(best[c.id], f.mm));
    if (f.sort === "match") return [...filtered].sort((a, b) => (best[b.id] ?? -1) - (best[a.id] ?? -1));
    return sortTalent(filtered, f.sort, f.q);
  }, [q.data, tax.data, f, best]);

  if (q.error || tax.error) return <ErrorBox msg={friendlyError(q.error ?? tax.error, "Unable to load candidates.")} retry={() => { q.refetch(); tax.refetch(); }} />;
  const t = tax.data;
  const pages = Math.max(1, Math.ceil(results.length / TALENT_PAGE_SIZE));
  const page = Math.min(f.page, pages);
  const shown = results.slice((page - 1) * TALENT_PAGE_SIZE, page * TALENT_PAGE_SIZE);
  const count = talentFilterCount(f);

  const filters = t && (
    <div className={`${card} p-5`}>
      <div className="mb-4 flex items-center justify-between"><p className="font-display font-bold">Filters</p>{count > 0 && <button onClick={() => navigate({ to: "/recruiter/candidates", search: { ...DEFAULT_TALENT, q: f.q } })} className="text-xs font-semibold text-primary">Clear all ({count})</button>}</div>
      <Group title="Match Score"><MatchFilter value={f.mm} onChange={(mm) => set({ mm })} /></Group>
      <Group title="Current Role"><select value={f.role} onChange={(e) => set({ role: e.target.value })} className={inputCls}><option value="">Any role</option>{t.roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Group>
      <Group title="Programming Languages"><IdToggle opts={t.languages} value={f.langs} onChange={(v) => set({ langs: v })} /></Group>
      <Group title="Technical Skills"><IdToggle opts={t.skills} value={f.skills} onChange={(v) => set({ skills: v })} /></Group>
      <Group title="Soft Skills"><IdToggle opts={t.softSkills} value={f.soft ?? []} onChange={(v) => set({ soft: v })} /></Group>
      <Group title="Technologies"><IdToggle opts={t.technologies} value={f.techs} onChange={(v) => set({ techs: v })} /></Group>
      <Group title="Years Of Experience"><div className="flex flex-wrap gap-1.5">{EXPERIENCE_BUCKETS.map(([k, l]) => <button key={k} onClick={() => set({ exp: f.exp === k ? "" : k })} aria-pressed={f.exp === k} className={`rounded-full border px-2.5 py-1 text-xs font-medium ${f.exp === k ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{l}</button>)}</div></Group>
      <Group title="Availability"><MultiToggle options={AVAILABILITY.map(([, l]) => l)} value={f.avail.map((a) => label(AVAILABILITY, a))} onChange={(v) => set({ avail: AVAILABILITY.filter(([, l]) => v.includes(l)).map(([k]) => k) })} /></Group>
      <Group title="Location"><input value={f.loc} onChange={(e) => set({ loc: e.target.value })} placeholder="City, state or country" className={inputCls} /><label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.remote} onChange={(e) => set({ remote: e.target.checked })} />Remote only</label></Group>
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
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="hidden lg:block">{filters}</aside>
        {open && <div className="fixed inset-0 z-40 overflow-y-auto bg-background p-4 lg:hidden"><div className="mb-3 flex justify-between"><p className="font-display text-lg font-bold">Filters</p><button onClick={() => setOpen(false)} aria-label="Close filters"><X className="h-5 w-5" /></button></div>{filters}<button onClick={() => setOpen(false)} className={`${primaryBtn} mt-4 w-full justify-center`}>Show {results.length} candidates</button></div>}
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-muted-foreground">{q.isLoading ? "Searching…" : `${results.length} candidate${results.length === 1 ? "" : "s"} found`}</p>
            <div className="flex items-center gap-2">
              <div role="group" aria-label="Results view" className="inline-flex rounded-xl border border-input p-0.5">
                {(["list", "grid"] as const).map((m) => <button key={m} type="button" aria-pressed={view === m} onClick={() => setView(m)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${view === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary"}`}>{m === "list" ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}<span className="hidden sm:inline">{m === "list" ? "List View" : "Grid View"}</span></button>)}
              </div>
              <select value={f.sort} onChange={(e) => set({ sort: e.target.value })} aria-label="Sort" className="rounded-xl border border-input bg-background px-3 py-2 text-sm">{TALENT_SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            </div></div>
{q.isLoading || !t ? <div className={view === "grid" ? "grid gap-4 sm:grid-cols-2 3xl:grid-cols-3" : "space-y-4"}>{[0, 1, 2, 3].map((i) => <div key={i} className={`${card} ${view === "grid" ? "h-96" : "h-48"} animate-pulse`} />)}</div>
            : shown.length === 0 ? <div className={`${card} p-10 text-center`}><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary-soft text-primary"><Search className="h-7 w-7" /></div><p className="mt-4 font-display text-lg font-bold">No Candidates Match Current Filters</p><p className="mt-1 text-sm text-muted-foreground">Try removing filters or broadening your keyword.</p>
                <div className="mt-5 flex justify-center gap-2"><button onClick={() => navigate({ to: "/recruiter/candidates", search: { ...DEFAULT_TALENT, q: f.q } })} className={primaryBtn}>Clear Filters</button><button onClick={() => { setKw(""); navigate({ to: "/recruiter/candidates", search: DEFAULT_TALENT }); }} className={btn}>Return To Search</button></div></div>
            : view === "grid" ? <div className="grid gap-4 sm:grid-cols-2 3xl:grid-cols-3">{shown.map((c) => <CandidateGridCard key={c.id} c={c} t={t} lists={lists} score={best[c.id]} />)}</div>
            : shown.map((c) => <CandidateCard key={c.id} c={c} t={t} lists={lists} score={best[c.id]} />)}
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
          <Item k="Programming Languages" v={prof(d.languages, t.languages)} /><Item k="Technical Skills" v={prof(d.skills, t.skills)} /><Item k="Soft Skills" v={<Chips soft ids={d.softSkills} opts={t.softSkills} max={50} />} /><Item k="Technologies" v={prof(d.technologies, t.technologies)} /></div>
        <div className={`${card} p-6`}><h2 className="font-display text-lg font-bold">Education</h2>{d.education.length ? <ul className="mt-3 space-y-3">{d.education.map((e) => <li key={e.education_id}><p className="font-semibold">{e.degree} {e.field_of_study && `· ${e.field_of_study}`}</p><p className="text-xs text-muted-foreground">{e.institution_name}{e.graduation_year && ` · ${e.graduation_year}`}</p></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">—</p>}</div>
        <div className={`${card} p-6`}><h2 className="font-display text-lg font-bold">Certifications</h2>{d.certifications.length ? <ul className="mt-3 space-y-3">{d.certifications.map((c) => <li key={c.certification_id}><p className="font-semibold">{c.certification_name}</p><p className="text-xs text-muted-foreground">{c.issuing_organization}{c.issue_date && ` · ${c.issue_date}`}</p></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">—</p>}</div>
        <div className={`${card} p-6`}><h2 className="font-display text-lg font-bold">Career Preferences</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2"><Item k="Target Roles" v={p.target_roles.join(", ")} /><Item k="Salary Expectation" v={p.salary_expectation} /><Item k="Work Arrangement" v={label(ARRANGEMENTS, p.work_arrangement)} /><Item k="Availability" v={label(AVAILABILITY, p.availability)} /><Item k="Locations Of Interest" v={p.locations_of_interest.join(", ")} /><Item k="Target Industries" v={p.target_industries.join(", ")} /></dl></div>
      </div>
    </div>
  );
}

export function ProfileHeader({ d, actions }: { d: CandidateFull; actions?: ReactNode }) {
  const p = d.profile;
  return (
    <div className={`${card} p-6`}>
      <div className="flex flex-wrap items-start gap-4"><Avatar name={d.name} size="h-16 w-16 text-xl" />
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
        <MessageButton role="recruiter" candidateId={id} className={btn} /></>} />
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
  const scoreQ = useScores({});
  const bestRow = (id: string) => (scoreQ.data ?? []).filter((r) => r.candidate_id === id).sort((a, b) => Number(b.overall_match_score) - Number(a.overall_match_score))[0];
  const pct = (id: string, k: "language_alignment_score" | "skill_alignment_score" | "technology_alignment_score" | "experience_alignment_score") => { const r = bestRow(id); return r ? `${Math.round(Number(r[k]))}%` : "—"; };
  const det = (id: string) => (bestRow(id)?.details ?? {}) as { strengths?: string[]; missing?: { languages?: string[]; skills?: string[]; technologies?: string[] } };
  const tax = useTaxonomy();
  const key = lists.compareIds.join(",");
  const q = useQuery({ queryKey: ["talent-ids", key], queryFn: () => talentByIds(lists.compareIds) });
  const t = tax.data;
  const rows: [string, (c: TalentRow) => ReactNode][] = t ? [
    ["Current Role", (c) => c.jobTitle], ["Employer", (c) => c.employer], ["Location", (c) => c.location], ["Experience", (c) => `${c.years} yrs`],
    ["Availability", (c) => label(AVAILABILITY, c.availability)], ["Work Arrangement", (c) => label(ARRANGEMENTS, c.arrangement)], ["Salary Expectation", (c) => c.salary],
    ["Languages", (c) => <Chips ids={c.langs} opts={t.languages} max={8} />], ["Skills", (c) => <Chips ids={c.skills} opts={t.skills} max={8} />], ["Technologies", (c) => <Chips ids={c.techs} opts={t.technologies} max={8} />],
    ["Profile Completion", (c) => `${c.completion}%`], ["Overall Match", (c) => { const r = bestRow(c.id); return r ? <span className="inline-flex flex-col gap-0.5"><MatchBadge score={r.overall_match_score} showLabel /><span className="text-[11px] text-muted-foreground">best across your jobs</span></span> : <MatchBadge score={null} />; }],
    ["Language Score", (c) => pct(c.id, "language_alignment_score")], ["Skill Score", (c) => pct(c.id, "skill_alignment_score")],
    ["Technology Score", (c) => pct(c.id, "technology_alignment_score")], ["Experience Score", (c) => pct(c.id, "experience_alignment_score")],
    ["Strengths", (c) => <ul className="space-y-0.5 text-xs">{(det(c.id).strengths ?? []).slice(0, 4).map((x) => <li key={x}>✓ {x}</li>)}</ul>],
    ["Weaknesses", (c) => { const m = det(c.id).missing ?? {}; const all = [...(m.languages ?? []), ...(m.skills ?? []), ...(m.technologies ?? [])]; return all.length ? <ul className="space-y-0.5 text-xs">{all.slice(0, 4).map((x) => <li key={x}>• Missing {x}</li>)}</ul> : null; }],
  ] : [];
  return (
    <div className="space-y-6 pb-16">
      <Link to="/recruiter/candidates" className="text-sm text-muted-foreground hover:text-primary">← Back to search</Link>
      <h1 className="font-display text-2xl font-extrabold">Compare Candidates</h1>
      {q.error ? <ErrorBox msg="Unable to load comparison." retry={() => q.refetch()} /> : q.isLoading || !t ? <div className={`${card} h-48 animate-pulse`} />
        : (q.data?.length ?? 0) < 2 ? <div className={`${card} p-10 text-center`}><p className="font-display text-lg font-bold">Select at least 2 candidates to compare</p><p className="mt-1 text-sm text-muted-foreground">You can compare up to {CANDIDATE_COMPARE_MAX}.</p>{q.data?.map((c) => <button key={c.id} onClick={() => lists.toggleCompare(c.id)} className={`${btn} mt-3`}>Remove {c.name}</button>)}<Link to="/recruiter/candidates" className={`${primaryBtn} ml-2 mt-4`}>Search talent</Link></div>
        : <div className={`${card} overflow-x-auto`}><table className="w-full min-w-[640px] text-sm"><thead><tr className="border-b border-border"><th className="p-4 text-left" />{q.data!.map((c) => <th key={c.id} className="p-4 text-left align-top"><Avatar name={c.name} path={c.avatarPath} size="h-10 w-10 text-sm" /><Link to="/recruiter/candidates/$id" params={{ id: c.id }} className="mt-2 block font-display font-bold hover:text-primary">{c.name}</Link><button onClick={() => lists.toggleCompare(c.id)} className="text-xs text-muted-foreground hover:text-destructive">Remove</button></th>)}</tr></thead>
          <tbody>{rows.map(([l, fn]) => <tr key={l} className="border-b border-border last:border-0"><td className="p-4 text-xs font-semibold uppercase text-muted-foreground">{l}</td>{q.data!.map((c) => <td key={c.id} className="p-4 align-top">{fn(c) || "—"}</td>)}</tr>)}</tbody></table></div>}
    </div>
  );
}
