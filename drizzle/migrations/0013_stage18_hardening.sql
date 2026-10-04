CREATE INDEX IF NOT EXISTS candidate_comparisons_candidate_idx ON public.candidate_comparisons(candidate_id);
CREATE INDEX IF NOT EXISTS recruiting_pipeline_candidate_idx ON public.recruiting_pipeline(candidate_id);
CREATE INDEX IF NOT EXISTS recruiting_pipeline_job_idx ON public.recruiting_pipeline(job_id);
CREATE INDEX IF NOT EXISTS saved_jobs_job_idx ON public.saved_jobs(job_id);
CREATE INDEX IF NOT EXISTS job_comparisons_job_idx ON public.job_comparisons(job_id);
CREATE INDEX IF NOT EXISTS saved_candidates_candidate_idx ON public.saved_candidates(candidate_id);
CREATE INDEX IF NOT EXISTS conversations_recruiter_idx ON public.conversations(recruiter_id);
CREATE INDEX IF NOT EXISTS conversations_job_idx ON public.conversations(job_id);
CREATE INDEX IF NOT EXISTS conversations_application_idx ON public.conversations(application_id);

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS f, p.prorettype = 'trigger'::regtype AS is_trg
           FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.prosecdef LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.f);
    IF r.is_trg THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', r.f);
    END IF;
  END LOOP;
END $$;