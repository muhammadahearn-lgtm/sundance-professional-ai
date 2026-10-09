CREATE TABLE public.candidate_notes (
  note_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL,
  author_id uuid NOT NULL DEFAULT auth.uid(),
  job_id uuid REFERENCES public.jobs(job_id) ON DELETE SET NULL,
  content text NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX candidate_notes_candidate_idx ON public.candidate_notes(candidate_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_notes TO authenticated;
GRANT ALL ON public.candidate_notes TO service_role;
ALTER TABLE public.candidate_notes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_read_candidate_note(_author uuid, _job uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _author = auth.uid()
    OR (_job IS NOT NULL AND public.owns_job(_job))
    OR EXISTS (SELECT 1 FROM company_members a JOIN company_members b ON a.company_id = b.company_id
               WHERE a.user_id = _author AND b.user_id = auth.uid())
$$;
REVOKE EXECUTE ON FUNCTION public.can_read_candidate_note(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_candidate_note(uuid, uuid) TO authenticated;

CREATE POLICY "team reads notes" ON public.candidate_notes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'recruiter') AND public.recruiter_can_view_candidate(candidate_id) AND public.can_read_candidate_note(author_id, job_id));
CREATE POLICY "recruiter adds notes" ON public.candidate_notes FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.has_role(auth.uid(), 'recruiter') AND public.recruiter_can_view_candidate(candidate_id) AND (job_id IS NULL OR public.owns_job(job_id)));
CREATE POLICY "author edits notes" ON public.candidate_notes FOR UPDATE TO authenticated
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid() AND (job_id IS NULL OR public.owns_job(job_id)));
CREATE POLICY "author deletes notes" ON public.candidate_notes FOR DELETE TO authenticated
  USING (author_id = auth.uid());
CREATE TRIGGER candidate_notes_updated BEFORE UPDATE ON public.candidate_notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();