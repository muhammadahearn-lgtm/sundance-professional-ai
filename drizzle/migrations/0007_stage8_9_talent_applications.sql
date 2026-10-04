CREATE OR REPLACE FUNCTION public.applied_to_my_job(_candidate uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.applications a JOIN public.jobs j ON j.job_id = a.job_id
                 WHERE a.candidate_id = _candidate AND j.recruiter_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.recruiter_can_view_candidate(_candidate uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'recruiter') AND (public.candidate_visible_to_recruiters(_candidate) OR public.applied_to_my_job(_candidate))
$$;

CREATE OR REPLACE FUNCTION public.candidate_names(_ids uuid[])
RETURNS TABLE(user_id uuid, first_name text, last_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id, p.first_name, p.last_name FROM public.profiles p
  WHERE p.user_id = ANY(_ids) AND public.recruiter_can_view_candidate(p.user_id)
$$;
REVOKE EXECUTE ON FUNCTION public.candidate_names(uuid[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.candidate_names(uuid[]) TO authenticated;

CREATE POLICY "Job owners read applicant profiles" ON public.candidate_profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'recruiter') AND public.applied_to_my_job(user_id));
CREATE POLICY "Job owners read applicant skills" ON public.candidate_skills FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'recruiter') AND public.applied_to_my_job(candidate_id));
CREATE POLICY "Job owners read applicant technologies" ON public.candidate_technologies FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'recruiter') AND public.applied_to_my_job(candidate_id));
CREATE POLICY "Job owners read applicant languages" ON public.candidate_languages FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'recruiter') AND public.applied_to_my_job(candidate_id));
CREATE POLICY "Job owners read applicant experience" ON public.work_experience FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'recruiter') AND public.applied_to_my_job(candidate_id));
CREATE POLICY "Job owners read applicant education" ON public.education FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'recruiter') AND public.applied_to_my_job(candidate_id));
CREATE POLICY "Job owners read applicant certifications" ON public.certifications FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'recruiter') AND public.applied_to_my_job(candidate_id));

CREATE POLICY "Recruiters read applicant resumes" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'resumes' AND public.has_role(auth.uid(),'recruiter') AND public.applied_to_my_job(((storage.foldername(name))[1])::uuid));

CREATE UNIQUE INDEX IF NOT EXISTS saved_candidates_unique ON public.saved_candidates (recruiter_id, candidate_id);
CREATE UNIQUE INDEX IF NOT EXISTS candidate_comparisons_unique ON public.candidate_comparisons (recruiter_id, candidate_id);
CREATE UNIQUE INDEX IF NOT EXISTS recruiting_pipeline_unique ON public.recruiting_pipeline (recruiter_id, candidate_id, job_id) NULLS NOT DISTINCT;

CREATE OR REPLACE FUNCTION public.candidate_comparisons_limit()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.candidate_comparisons WHERE recruiter_id = NEW.recruiter_id) >= 4 THEN
    RAISE EXCEPTION 'You can compare up to 4 candidates';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER candidate_comparisons_limit BEFORE INSERT ON public.candidate_comparisons FOR EACH ROW EXECUTE FUNCTION public.candidate_comparisons_limit();

CREATE OR REPLACE FUNCTION public.pipeline_job_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.job_id IS NOT NULL AND NOT public.owns_job(NEW.job_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  IF NOT public.recruiter_can_view_candidate(NEW.candidate_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  IF TG_OP = 'UPDATE' AND NEW.current_stage IS DISTINCT FROM OLD.current_stage THEN NEW.stage_date = now(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER pipeline_job_guard BEFORE INSERT OR UPDATE ON public.recruiting_pipeline FOR EACH ROW EXECUTE FUNCTION public.pipeline_job_guard();