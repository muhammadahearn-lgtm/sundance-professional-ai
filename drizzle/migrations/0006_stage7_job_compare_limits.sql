CREATE UNIQUE INDEX IF NOT EXISTS job_comparisons_candidate_job_key ON public.job_comparisons (candidate_id, job_id);

CREATE OR REPLACE FUNCTION public.job_comparisons_limit()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.job_comparisons WHERE candidate_id = NEW.candidate_id) >= 4 THEN
    RAISE EXCEPTION 'You can compare up to 4 jobs';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER job_comparisons_limit BEFORE INSERT ON public.job_comparisons FOR EACH ROW EXECUTE FUNCTION public.job_comparisons_limit();