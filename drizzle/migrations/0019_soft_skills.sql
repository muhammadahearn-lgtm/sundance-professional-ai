CREATE TABLE public.soft_skills (
  soft_skill_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  soft_skill_name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.soft_skills TO anon, authenticated;
GRANT ALL ON public.soft_skills TO service_role;
ALTER TABLE public.soft_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Taxonomy readable" ON public.soft_skills FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.candidate_soft_skills (
  candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(user_id) ON DELETE CASCADE,
  lookup_id uuid NOT NULL REFERENCES public.soft_skills(soft_skill_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (candidate_id, lookup_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_soft_skills TO authenticated;
GRANT ALL ON public.candidate_soft_skills TO service_role;
ALTER TABLE public.candidate_soft_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Candidates manage own" ON public.candidate_soft_skills FOR ALL TO authenticated
  USING (candidate_id = auth.uid())
  WITH CHECK (candidate_id = auth.uid() AND public.has_role(auth.uid(), 'candidate'::public.app_role));
CREATE POLICY "Recruiters read searchable" ON public.candidate_soft_skills FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'recruiter'::public.app_role) AND public.candidate_visible_to_recruiters(candidate_id));
CREATE POLICY "Job owners read applicant soft skills" ON public.candidate_soft_skills FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'recruiter'::public.app_role) AND public.applied_to_my_job(candidate_id));

CREATE TABLE public.job_soft_skills (
  job_id uuid NOT NULL REFERENCES public.jobs(job_id) ON DELETE CASCADE,
  lookup_id uuid NOT NULL REFERENCES public.soft_skills(soft_skill_id) ON DELETE CASCADE,
  required_flag boolean NOT NULL DEFAULT true,
  requirement_level text NOT NULL DEFAULT 'required',
  PRIMARY KEY (job_id, lookup_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_soft_skills TO authenticated;
GRANT ALL ON public.job_soft_skills TO service_role;
ALTER TABLE public.job_soft_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Job owners manage" ON public.job_soft_skills FOR ALL TO authenticated USING (public.owns_job(job_id)) WITH CHECK (public.owns_job(job_id));
CREATE POLICY "Read for active jobs" ON public.job_soft_skills FOR SELECT TO authenticated USING (public.job_is_active(job_id));
CREATE INDEX job_soft_skills_lookup_idx ON public.job_soft_skills(lookup_id);
CREATE INDEX candidate_soft_skills_lookup_idx ON public.candidate_soft_skills(lookup_id);