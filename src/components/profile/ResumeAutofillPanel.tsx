// Profile page "Auto-fill from resume": parse, show what will be added, save only on confirm.
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ResumeUploadCard } from "./ResumeUploadCard";
import { useResumeCatalogs, loadExisting, applyResumePlan } from "@/lib/resume-import";
import { planResumeImport, planCount, type ResumeImportPlan } from "@/lib/resume-apply";
import type { MatchedResume } from "@/lib/resume-taxonomy-matcher";
import type { ParsedResume } from "@/lib/resume-parse";

type Profile = { headline: string; summary: string; linkedin_url: string; github_url: string; portfolio_url: string; job_title: string };

export function ResumeAutofillPanel({ uid, profile }: { uid: string; profile: Profile }) {
  const qc = useQueryClient();
  const catalogs = useResumeCatalogs();
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState<{ plan: ResumeImportPlan; patch: Partial<Profile>; m: MatchedResume } | null>(null);
  const [saving, setSaving] = useState(false);

  async function onParsed(p: ParsedResume, m: MatchedResume) {
    const plan = planResumeImport(p, m, await loadExisting(uid));
    const patch: Partial<Profile> = {};
    const fill = (k: keyof Profile, v: string, max: number) => { if (!profile[k]?.trim() && v.trim()) patch[k] = v.trim().slice(0, max); };
    fill("headline", p.headline, 140); fill("summary", p.summary, 2000); fill("job_title", m.currentRole?.name ?? p.job_title, 100);
    fill("linkedin_url", p.linkedin_url, 300); fill("github_url", p.github_url, 300); fill("portfolio_url", p.portfolio_url, 300);
    setReview({ plan, patch, m });
  }

  async function confirm() {
    if (!review) return;
    setSaving(true);
    let failed = await applyResumePlan(uid, review.plan);
    if (Object.keys(review.patch).length) { const { error } = await supabase.from("candidate_profiles").update(review.patch).eq("user_id", uid); if (error) failed++; }
    setSaving(false);
    await qc.invalidateQueries({ queryKey: ["candidate-full", uid] });
    if (failed) toast.error("Some items couldn't be added. Please check your profile."); else toast.success("Profile updated from your resume");
    setReview(null); setOpen(false);
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary-soft/50 p-4 text-left hover:border-primary">
      <Sparkles className="h-5 w-5 text-primary" /><span><span className="block text-sm font-semibold">Auto-fill from your resume</span><span className="text-xs text-muted-foreground">Add missing skills, jobs, education and certifications in one go. You review before anything is saved.</span></span>
    </button>
  );

  const pl = review?.plan;
  const lines = pl ? [
    [pl.languageIds.length + pl.skillIds.length + pl.technologyIds.length + pl.softSkillIds.length, "skills, languages & tools"],
    [pl.jobs.length, "jobs"], [pl.education.length, "schools"], [pl.certifications.length, "certifications"],
    [Object.keys(review!.patch).length, "empty profile fields filled"],
  ].filter(([n]) => (n as number) > 0) as [number, string][] : [];

  return (
    <div className="relative">
      <button aria-label="Close" onClick={() => { setOpen(false); setReview(null); }} className="absolute right-3 top-3 z-10 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      {!review ? <ResumeUploadCard catalogs={catalogs.data ?? null} onParsed={onParsed} /> : (
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="font-semibold">Review what we'll add</h3>
          {lines.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Your profile already has everything we found in this resume.</p> : (
            <ul className="mt-3 space-y-1 text-sm">{lines.map(([n, l]) => <li key={l}>• {n} {l}</li>)}</ul>
          )}
          <p className="mt-3 text-xs text-muted-foreground">Existing entries are never changed or duplicated. Jobs without a start date are skipped.</p>
          {review.m.unmatched.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Not on our lists yet — add them yourself below if you'd like: {review.m.unmatched.map((u) => u.name).join(", ")}.</p>}
          <div className="mt-4 flex gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setReview(null)}>Use a different file</Button>
            <Button className="rounded-full" disabled={saving || planCount(review.plan) + Object.keys(review.patch).length === 0} onClick={confirm}>{saving ? "Adding…" : "Add to my profile"}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
