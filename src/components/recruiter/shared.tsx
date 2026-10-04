import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { card } from "@/components/profile/parts";

export const CANDIDATE_TYPES = ["Software Engineers", "Data Engineers", "Data Scientists", "AI Engineers", "Machine Learning Engineers", "Cloud Engineers", "Cybersecurity Professionals", "Business Analysts", "Product Managers"];
export const INDUSTRIES = ["Technology", "Healthcare", "Financial Services", "Insurance", "Manufacturing", "Government", "Consulting", "Retail", "Telecommunications", "Startups"];
export const EXPERIENCE_LEVELS = ["Entry Level", "Mid Level", "Senior Level", "Executive"];
export const WORK_ARRANGEMENTS = ["Remote", "Hybrid", "On-Site"];
export const REGIONS = ["North America", "United States", "Canada", "Europe", "United Kingdom", "Latin America", "Asia Pacific", "Remote"];
export const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1,000", "1,001-5,000", "5,000+"];
export const ORG_TYPES: [string, string][] = [
  ["corporate_employer", "Corporate Employer"], ["staffing_agency", "Staffing Agency"], ["executive_search_firm", "Executive Search Firm"],
  ["consulting_firm", "Consulting Firm"], ["independent_recruiter", "Independent Recruiter"],
];
export const HIRING_VOLUMES = ["1-5 hires / year", "6-20 hires / year", "21-50 hires / year", "50+ hires / year"];
export const VISIBILITY: [string, string, string][] = [
  ["active", "Active Recruiter", "Currently recruiting."],
  ["browsing", "Browsing Only", "Exploring talent."],
  ["hiring_now", "Hiring Immediately", "Actively trying to fill positions."],
];
export const CONTACT_METHODS: [string, string][] = [["email", "Email"], ["phone", "Phone"], ["in_app", "In-App Messages"]];

/** Normalize legacy free-text org types from onboarding to enum keys. */
export function orgKey(v: string): string {
  const hit = ORG_TYPES.find(([k, l]) => k === v || l.toLowerCase() === v.toLowerCase());
  return hit ? hit[0] : "";
}

export function MultiToggle({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button type="button" key={o} aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${on ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary hover:text-primary"}`}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm font-medium">{label}</span>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

export function CompletionCard({ percent, suggestions, title = "Profile Completion" }: { percent: number; suggestions: string[]; title?: string }) {
  return (
    <div className={`${card} p-5`}>
      <div className="flex items-baseline justify-between"><p className="font-display font-bold">{title}</p><span className="font-display text-2xl font-extrabold text-primary">{percent}%</span></div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} /></div>
      {suggestions.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">{suggestions.map((s) => <li key={s} className="flex gap-2"><span className="text-primary">•</span>{s}</li>)}</ul>
      ) : <p className="mt-4 text-sm text-muted-foreground">Your profile is complete. Nice work!</p>}
    </div>
  );
}

export function Item({ k, v }: { k: string; v: ReactNode }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{k}</dt><dd className="mt-1 text-sm">{v || "—"}</dd></div>;
}

/** Resolve a private branding path to a short-lived signed URL. */
export function useBrandingUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (!path) { setUrl(null); return; }
    supabase.storage.from("company-branding").createSignedUrl(path, 3600).then(({ data }) => { if (live) setUrl(data?.signedUrl ?? null); });
    return () => { live = false; };
  }, [path]);
  return url;
}

export function BrandImg({ path, className, alt }: { path: string; className: string; alt: string }) {
  const url = useBrandingUrl(path);
  return url ? <img src={url} alt={alt} className={className} loading="lazy" /> : <div className={`${className} animate-pulse bg-muted`} />;
}

export const initials = (a: string, b: string) => `${a.charAt(0)}${b.charAt(0)}`.toUpperCase() || "R";
