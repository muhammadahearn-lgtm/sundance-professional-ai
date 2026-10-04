CREATE TABLE public.career_snapshots (
  snapshot_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(user_id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT current_date,
  readiness_score numeric NOT NULL DEFAULT 0,
  average_match numeric,
  profile_completion numeric NOT NULL DEFAULT 0,
  skill_count integer NOT NULL DEFAULT 0,
  technology_count integer NOT NULL DEFAULT 0,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, snapshot_date)
);
GRANT SELECT, INSERT, UPDATE ON public.career_snapshots TO authenticated;
GRANT ALL ON public.career_snapshots TO service_role;
ALTER TABLE public.career_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Candidates read own snapshots" ON public.career_snapshots FOR SELECT TO authenticated USING (candidate_id = auth.uid());
CREATE POLICY "Candidates add own snapshots" ON public.career_snapshots FOR INSERT TO authenticated WITH CHECK (candidate_id = auth.uid() AND public.has_role(auth.uid(), 'candidate'));
CREATE POLICY "Candidates update own snapshots" ON public.career_snapshots FOR UPDATE TO authenticated USING (candidate_id = auth.uid()) WITH CHECK (candidate_id = auth.uid());
CREATE INDEX idx_career_snapshots_candidate ON public.career_snapshots (candidate_id, snapshot_date DESC);