ALTER TABLE public.candidate_profiles
  ADD COLUMN recruiter_resume_choice text NOT NULL DEFAULT 'original';

ALTER TABLE public.candidate_profiles
  ADD CONSTRAINT candidate_profiles_recruiter_resume_choice_check
  CHECK (recruiter_resume_choice IN ('original', 'standard'));

CREATE TABLE public.candidate_spoken_languages (
  spoken_language_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(user_id) ON DELETE CASCADE,
  language_name text NOT NULL,
  proficiency text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT candidate_spoken_languages_name_check CHECK (char_length(btrim(language_name)) BETWEEN 2 AND 80),
  CONSTRAINT candidate_spoken_languages_proficiency_check CHECK (proficiency IN ('native_bilingual', 'fluent', 'professional', 'conversational', 'basic'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_spoken_languages TO authenticated;
GRANT ALL ON public.candidate_spoken_languages TO service_role;
ALTER TABLE public.candidate_spoken_languages ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX candidate_spoken_languages_candidate_name_unique
  ON public.candidate_spoken_languages (candidate_id, lower(btrim(language_name)));
CREATE INDEX candidate_spoken_languages_candidate_idx
  ON public.candidate_spoken_languages (candidate_id);
CREATE POLICY "Candidates manage own spoken languages"
  ON public.candidate_spoken_languages FOR ALL TO authenticated
  USING (auth.uid() = candidate_id)
  WITH CHECK (auth.uid() = candidate_id AND public.has_role(auth.uid(), 'candidate'));
CREATE POLICY "Recruiters read visible spoken languages"
  ON public.candidate_spoken_languages FOR SELECT TO authenticated
  USING (public.recruiter_can_view_candidate(candidate_id));

CREATE TABLE public.standard_resume_versions (
  standard_resume_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(user_id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  snapshot jsonb NOT NULL,
  pdf_path text NOT NULL,
  include_photo boolean NOT NULL DEFAULT false,
  section_order text[] NOT NULL DEFAULT ARRAY['summary','experience','skills','technologies','programming_languages','soft_skills','education','certifications','spoken_languages','projects']::text[],
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT standard_resume_versions_version_check CHECK (version_number > 0),
  CONSTRAINT standard_resume_versions_snapshot_object_check CHECK (jsonb_typeof(snapshot) = 'object'),
  CONSTRAINT standard_resume_versions_pdf_path_check CHECK (pdf_path LIKE candidate_id::text || '/standard/%')
);
GRANT SELECT, INSERT ON public.standard_resume_versions TO authenticated;
GRANT ALL ON public.standard_resume_versions TO service_role;
ALTER TABLE public.standard_resume_versions ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX standard_resume_versions_candidate_version_unique
  ON public.standard_resume_versions (candidate_id, version_number);
CREATE INDEX standard_resume_versions_candidate_published_idx
  ON public.standard_resume_versions (candidate_id, published_at DESC);
CREATE POLICY "Candidates read own standard resumes"
  ON public.standard_resume_versions FOR SELECT TO authenticated
  USING (auth.uid() = candidate_id);
CREATE POLICY "Candidates publish own standard resumes"
  ON public.standard_resume_versions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = candidate_id AND public.has_role(auth.uid(), 'candidate'));
CREATE POLICY "Recruiters read visible standard resumes"
  ON public.standard_resume_versions FOR SELECT TO authenticated
  USING (public.recruiter_can_view_candidate(candidate_id));

CREATE OR REPLACE FUNCTION public.standard_resume_version_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.candidate_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(NEW.candidate_id::text));
  NEW.version_number := COALESCE((
    SELECT max(v.version_number) + 1
    FROM public.standard_resume_versions v
    WHERE v.candidate_id = NEW.candidate_id
  ), 1);
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.standard_resume_version_guard() FROM anon, authenticated, public;
CREATE TRIGGER standard_resume_version_guard
  BEFORE INSERT ON public.standard_resume_versions
  FOR EACH ROW EXECUTE FUNCTION public.standard_resume_version_guard();

CREATE POLICY "Recruiters read visible candidate resumes"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'resumes'
    AND public.has_role(auth.uid(), 'recruiter')
    AND public.recruiter_can_view_candidate(((storage.foldername(name))[1])::uuid)
  );