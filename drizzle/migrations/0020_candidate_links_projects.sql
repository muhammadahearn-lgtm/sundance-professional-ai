ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS linkedin_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS github_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS portfolio_url text NOT NULL DEFAULT '';

CREATE TABLE public.candidate_projects (
  project_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(user_id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  project_url text NOT NULL DEFAULT '',
  technologies text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_projects TO authenticated;
GRANT ALL ON public.candidate_projects TO service_role;
ALTER TABLE public.candidate_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Candidates manage own projects" ON public.candidate_projects FOR ALL TO authenticated
  USING (candidate_id = auth.uid()) WITH CHECK (candidate_id = auth.uid());
CREATE POLICY "Recruiters view visible candidate projects" ON public.candidate_projects FOR SELECT TO authenticated
  USING (public.recruiter_can_view_candidate(candidate_id));
CREATE INDEX candidate_projects_candidate_idx ON public.candidate_projects(candidate_id);
CREATE TRIGGER candidate_projects_updated BEFORE UPDATE ON public.candidate_projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();