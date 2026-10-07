// Profile page "Auto-fill from resume": parse, show what will be added, save only on confirm.
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ResumeUploadCard } from "./ResumeUploadCard";
import { useResumeCatalogs, loadExisting, applyResumePlan } from "@/lib/resume-import";
import { planResumeImport, planCount, type ResumeImportPlan } from "@/lib/resume-apply";
import type { MatchedResume } from "@/lib/resume-taxonomy-matcher";
import type { ParsedResume } from "@/lib/resume-parse";

type Profile = { headline: string; summary: string; linkedin_url: string; github_url: string; portfolio_url: string; job_title: string };

export function ResumeAutofillPanel({ uid, profile, open, onOpenChange, initialFile }: { uid: string; profile: Profile; open: boolean; initialFile?: File | null; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const catalogs = useResumeCatalogs();
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
    setReview(null); onOpenChange(false);
  }

  const pl = review?.plan;
  const lines = pl ? [
    [pl.languageIds.length + pl.skillIds.length + pl.technologyIds.length + pl.softSkillIds.length, "skills, languages & tools"],
    [pl.jobs.length, "jobs"], [pl.education.length, "schools"], [pl.certifications.length, "certifications"],
    [Object.keys(review!.patch).length, "empty profile fields filled"],
  ].filter(([n]) => (n as number) > 0) as [number, string][] : [];

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setReview(null); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />Auto-fill with AI</DialogTitle>
          <DialogDescription>Add missing skills, jobs, education and certifications from your resume. You review before anything is saved.</DialogDescription>
        </DialogHeader>
      {!review ? <ResumeUploadCard catalogs={catalogs.data ?? null} onParsed={onParsed} initialFile={initialFile ?? null} /> : (
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
      </DialogContent>
    </Dialog>
  );
}
