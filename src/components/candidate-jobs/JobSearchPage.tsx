import { SearchPicker } from "@/components/taxonomy/SearchPicker";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, Clock, PanelLeftClose, PanelLeftOpen, Search, SlidersHorizontal, Sparkles, TrendingUp, X } from "lucide-react";
import { useFiltersHidden } from "@/hooks/use-filters-hidden";
import type { Account } from "@/lib/account";
import { loadTaxonomy, type Taxonomy } from "@/lib/jobs-data";
import { searchJobs } from "@/lib/job-search-data";
import { DEFAULT_SEARCH, EXPERIENCE_BUCKETS, PAGE_SIZE, POPULAR_SEARCHES, SALARY_MAX, SORTS, activeFilterCount, readRecent, saveRecent, type SearchState } from "@/lib/job-search";
import { card, friendlyError, inputCls } from "@/components/profile/parts";
import { Slider } from "@/components/ui/slider";
import { ARRANGEMENT, EMPLOYMENT } from "@/components/jobs/shared";
import { supabase } from "@/integrations/supabase/client";
import { CompareTray, JobCard } from "./JobCard";
import { MatchFilter, useAutoRecalc, useScores } from "@/components/match/Match";
import { useJobLists } from "./useJobLists";

type Props = { account: Account; search: SearchState; setSearch: (patch: Partial<SearchState>) => void };

export function JobSearchPage({ account, search, setSearch }: Props) {
  const uid = account.userId;
  const lists = useJobLists(uid);
  const tax = useQuery({ queryKey: ["taxonomy"], queryFn: loadTaxonomy, staleTime: 5 * 60_000 });
  useAutoRecalc();
  const scoreQ = useScores({ candidateId: uid });
  const scoreMap = Object.fromEntries((scoreQ.data ?? []).map((r) => [r.job_id, Number(r.overall_match_score)]));
  const results = useQuery({ queryKey: ["job-search", search, scoreQ.dataUpdatedAt], queryFn: () => searchJobs(search, tax.data!, scoreMap), enabled: !!tax.data && !scoreQ.isLoading, placeholderData: keepPreviousData });
  const suggested = useQuery({ queryKey: ["candidate-suggest", uid], queryFn: async () => {
    const { data } = await supabase.from("candidate_profiles").select("target_roles, job_title").eq("user_id", uid).maybeSingle();
    return [...new Set([...(data?.target_roles ?? []), data?.job_title ?? ""].filter(Boolean))].slice(0, 4);
  } });
  const [q, setQ] = useState(search.q);
  const [recent, setRecent] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersHidden, setFiltersHidden] = useFiltersHidden("job-filters-hidden");
  useEffect(() => setRecent(readRecent()), []);
  useEffect(() => setQ(search.q), [search.q]);

  const runSearch = (value: string) => {
    setSearch({ q: value.trim(), page: 1 });
    if (value.trim()) setRecent(saveRecent(value));
    toast.success("Search updated");
  };
  const submit = (e: FormEvent) => { e.preventDefault(); runSearch(q); };
  const total = results.data?.total ?? 0, pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const nFilters = activeFilterCount(search);
  const roleName = (id: string | null) => tax.data?.allRoles.find((r) => r.id === id)?.name;

  return (
    <div className="space-y-5 pb-16">
      <div className="sticky top-0 z-20 -mx-4 bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <form onSubmit={submit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input aria-label="Search jobs" className={`${inputCls} pl-9`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Job title, skill, technology, language or company" />
          </div>
          <button className="rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90">Search</button>
          <button type="button" onClick={() => setFiltersOpen(!filtersOpen)} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-semibold lg:hidden" aria-expanded={filtersOpen}>
            <SlidersHorizontal className="h-4 w-4" />{nFilters > 0 && <span className="rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground">{nFilters}</span>}
          </button>
        </form>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          {recent.length > 0 && <><Clock className="h-3.5 w-3.5 text-muted-foreground" />{recent.map((r) => <Chip key={r} onClick={() => runSearch(r)}>{r}</Chip>)}</>}
          {(suggested.data ?? []).length > 0 && <><Sparkles className="ml-1 h-3.5 w-3.5 text-primary" />{suggested.data!.map((r) => <Chip key={r} onClick={() => runSearch(r)}>{r}</Chip>)}</>}
          <TrendingUp className="ml-1 h-3.5 w-3.5 text-muted-foreground" />{POPULAR_SEARCHES.map((r) => <Chip key={r} onClick={() => runSearch(r)}>{r}</Chip>)}
        </div>
      </div>

      <div className={`grid gap-6 ${filtersHidden ? "" : "lg:grid-cols-[280px_1fr]"}`}>
        <aside className={`${filtersOpen ? "block" : "hidden"} ${filtersHidden ? "lg:hidden" : "lg:block"}`}>
          {tax.data ? <Filters tax={tax.data} s={search} set={setSearch} onHide={() => setFiltersHidden(true)} onApply={() => { setFiltersOpen(false); toast.success("Filters applied"); }} /> : <div className={`${card} h-96 animate-pulse`} />}
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {filtersHidden && <button type="button" onClick={() => setFiltersHidden(false)} className="hidden items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold hover:border-primary hover:text-primary lg:inline-flex"><PanelLeftOpen className="h-4 w-4" />Show Filters{nFilters > 0 && <span className="rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground">{nFilters}</span>}</button>}
              <p className="text-sm"><span className="font-bold">{total}</span> <span className="text-muted-foreground">active {total === 1 ? "job" : "jobs"}{search.q && <> for “{search.q}”</>}</span></p>
            </div>
            <div className="w-48"><select aria-label="Sort" className={inputCls} value={search.sort} onChange={(e) => setSearch({ sort: e.target.value, page: 1 })}>{SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          </div>

          {results.error || tax.error ? (
            <div className={`${card} p-8 text-center`}><p className="font-semibold">{friendlyError(results.error ?? tax.error, "Unable to load jobs.")}</p><button onClick={() => { tax.refetch(); results.refetch(); }} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Try again</button></div>
          ) : !results.data ? <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className={`${card} h-40 animate-pulse`} />)}</div>
          : !results.data.rows.length ? (
            <div className={`${card} p-10 text-center`}>
              <p className="font-display text-lg font-bold">No jobs found.</p>
              <p className="mt-1 text-sm text-muted-foreground">Try changing your filters or search with different keywords.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {nFilters > 0 && <button onClick={() => setSearch({ ...DEFAULT_SEARCH, q: search.q })} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary">Remove filters</button>}
                <button onClick={() => { setQ(""); setSearch(DEFAULT_SEARCH); }} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">View all jobs</button>
              </div>
            </div>
          ) : (
            <div className={`space-y-3 ${results.isFetching ? "opacity-60" : ""}`}>
              {results.data.rows.map((j) => <JobCard key={j.job_id} j={j} roleName={roleName(j.role_id)} lists={lists} score={scoreMap[j.job_id]} scoreRow={scoreQ.data?.find((r) => r.job_id === j.job_id)} tax={tax.data} />)}
              {pages > 1 && (
                <nav className="flex items-center justify-center gap-2 pt-2" aria-label="Pagination">
                  <button disabled={search.page <= 1} onClick={() => setSearch({ page: search.page - 1 })} className="rounded-xl border border-border px-3 py-1.5 text-sm font-semibold disabled:opacity-40">Previous</button>
                  <span className="text-sm text-muted-foreground">Page {search.page} of {pages}</span>
                  <button disabled={search.page >= pages} onClick={() => setSearch({ page: search.page + 1 })} className="rounded-xl border border-border px-3 py-1.5 text-sm font-semibold disabled:opacity-40">Next</button>
                </nav>
              )}
            </div>
          )}

          <div className={`${card} border-dashed p-5`}>
            <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><p className="font-display font-bold">Recommended Jobs</p><span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">Coming Soon</span></div>
            <p className="mt-1 text-sm text-muted-foreground">Personalized picks based on your profile are on the way. Sample:</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[["Senior Data Engineer", "Snowflake · Remote"], ["ML Engineer", "Python · Hybrid"], ["Cloud Engineer", "AWS · On-Site"]].map(([t, s]) => (
                <div key={t} aria-hidden className="rounded-xl border border-border bg-muted/30 p-4 opacity-70"><p className="text-sm font-semibold">{t}</p><p className="text-xs text-muted-foreground">{s}</p><div className="mt-3 h-1.5 rounded-full bg-muted" /></div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <CompareTray lists={lists} />
    </div>
  );
}

function Chip({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-full border border-border px-2.5 py-0.5 hover:border-primary hover:text-primary">{children}</button>;
}

function Group({ title, children, open: o = true }: { title: string; children: ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(o);
  return (
    <div className="border-b border-border py-3 last:border-0">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-sm font-semibold" aria-expanded={open}>{title}<ChevronDown className={`h-4 w-4 transition-transform ${open ? "" : "-rotate-90"}`} /></button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function CheckList({ options, value, onChange, limit = 8 }: { options: { id: string; name: string }[]; value: string[]; onChange: (v: string[]) => void; limit?: number }) {
  const [q, setQ] = useState(""), [all, setAll] = useState(false);
  const list = options.filter((o) => o.name.toLowerCase().includes(q.toLowerCase()));
  const shown = all || q ? list : [...list.filter((o) => value.includes(o.id)), ...list.filter((o) => !value.includes(o.id))].slice(0, limit);
  return (
    <div className="space-y-2">
      {options.length > limit && <input className={`${inputCls} py-1.5 text-xs`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />}
      <div className="max-h-56 space-y-1.5 overflow-y-auto">
        {shown.map((o) => (
          <label key={o.id} className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-primary" checked={value.includes(o.id)} onChange={(e) => onChange(e.target.checked ? [...value, o.id] : value.filter((x) => x !== o.id))} />{o.name}
          </label>
        ))}
      </div>
      {!q && list.length > limit && <button type="button" onClick={() => setAll(!all)} className="text-xs font-semibold text-primary">{all ? "Show less" : `Show all ${list.length}`}</button>}
    </div>
  );
}

function Filters({ tax, s, set, onApply, onHide }: { tax: Taxonomy; s: SearchState; set: (p: Partial<SearchState>) => void; onApply: () => void; onHide: () => void }) {
  const p = (patch: Partial<SearchState>) => set({ ...patch, page: 1 });
  const [loc, setLoc] = useState(s.loc), [company, setCompany] = useState(s.company);
  const [sal, setSal] = useState<[number, number]>([s.smin, s.smax || SALARY_MAX]);
  useEffect(() => { setLoc(s.loc); setCompany(s.company); setSal([s.smin, s.smax || SALARY_MAX]); }, [s.loc, s.company, s.smin, s.smax]);
  const fmt = (n: number) => (n >= SALARY_MAX ? `$${SALARY_MAX / 1000}k+` : `$${Math.round(n / 1000)}k`);
  const n = activeFilterCount(s);
  return (
    <div className={`${card} p-5 lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto`}>
      <div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><p className="font-display font-bold">Filters</p><button type="button" onClick={onHide} aria-label="Hide filters" title="Hide filters" className="hidden rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-primary lg:inline-flex"><PanelLeftClose className="h-4 w-4" /></button></div>{n > 0 && <button onClick={() => set({ ...DEFAULT_SEARCH, q: s.q, sort: s.sort })} className="inline-flex items-center gap-1 text-xs font-semibold text-primary"><X className="h-3 w-3" />Clear {n}</button>}</div>
      <Group title="Match Score"><MatchFilter value={s.mm} onChange={(mm) => p({ mm })} /></Group>
      <Group title="Role"><SearchPicker ariaLabel="Role filter" grouped options={tax.roles} value={s.role} onChange={(v) => p({ role: v })} placeholder="Search role" emptyLabel="All roles" /></Group>
      <Group title="Level"><SearchPicker ariaLabel="Level filter" options={tax.levels} value={s.level ?? ""} onChange={(v) => p({ level: v })} placeholder="Search level" emptyLabel="All levels" /></Group>
      <Group title="Programming Languages" open={false}><CheckList options={tax.languages} value={s.langs} onChange={(v) => p({ langs: v })} /></Group>
      <Group title="Technical Skills" open={false}><CheckList options={tax.skills} value={s.skills} onChange={(v) => p({ skills: v })} /></Group>
      <Group title="Tools & Technologies" open={false}><CheckList options={tax.technologies} value={s.techs} onChange={(v) => p({ techs: v })} /></Group>
      <Group title="Work Arrangement"><CheckList options={ARRANGEMENT.map(([id, name]) => ({ id, name }))} value={s.arr} onChange={(v) => p({ arr: v })} /></Group>
      <Group title="Employment Type"><CheckList options={EMPLOYMENT.map(([id, name]) => ({ id, name }))} value={s.emp} onChange={(v) => p({ emp: v })} /></Group>
      <Group title="Experience">
        <div className="space-y-1.5">{[["", "Any"] as const, ...EXPERIENCE_BUCKETS.map(([k, l]) => [k, l] as const)].map(([k, l]) => (
          <label key={k} className="flex cursor-pointer items-center gap-2 text-sm"><input type="radio" name="exp" className="h-4 w-4 accent-primary" checked={s.exp === k} onChange={() => p({ exp: k })} />{l}</label>
        ))}</div>
      </Group>
      <Group title="Salary Range">
        <div className="flex justify-between text-xs font-semibold"><span>{fmt(sal[0])}</span><span>{fmt(sal[1])}</span></div>
        <Slider className="my-4" min={0} max={SALARY_MAX} step={10000} value={sal} onValueChange={(v) => setSal([v[0] ?? 0, v[1] ?? SALARY_MAX])}
          onValueCommit={(v) => p({ smin: v[0] ?? 0, smax: (v[1] ?? SALARY_MAX) >= SALARY_MAX ? 0 : v[1] ?? 0 })} aria-label="Salary range" />
        <div className="grid grid-cols-2 gap-2">
          <input type="number" aria-label="Minimum salary" className={`${inputCls} py-1.5 text-xs`} placeholder="Min" value={s.smin || ""} onChange={(e) => p({ smin: Math.max(0, Number(e.target.value) || 0) })} />
          <input type="number" aria-label="Maximum salary" className={`${inputCls} py-1.5 text-xs`} placeholder="Max" value={s.smax || ""} onChange={(e) => p({ smax: Math.max(0, Number(e.target.value) || 0) })} />
        </div>
      </Group>
      <Group title="Location">
        <input className={inputCls} value={loc} onChange={(e) => setLoc(e.target.value)} onBlur={() => loc !== s.loc && p({ loc })} onKeyDown={(e) => e.key === "Enter" && p({ loc })} placeholder="City, state or country" />
        <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-primary" checked={s.arr.includes("remote")} onChange={(e) => p({ arr: e.target.checked ? [...new Set([...s.arr, "remote"])] : s.arr.filter((x) => x !== "remote") })} />Remote</label>
      </Group>
      <Group title="Company"><input className={inputCls} value={company} onChange={(e) => setCompany(e.target.value)} onBlur={() => company !== s.company && p({ company })} onKeyDown={(e) => e.key === "Enter" && p({ company })} placeholder="Company name" /></Group>
      <button onClick={onApply} className="mt-4 w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground lg:hidden">Show results</button>
      <Link to="/candidate/jobs/saved" className="mt-4 hidden text-center text-sm font-semibold text-primary lg:block">View saved jobs →</Link>
    </div>
  );
}
