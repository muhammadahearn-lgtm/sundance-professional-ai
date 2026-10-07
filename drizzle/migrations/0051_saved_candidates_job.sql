ALTER TABLE public.saved_candidates ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES public.jobs(job_id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS saved_candidates_job_idx ON public.saved_candidates(job_id);

CREATE OR REPLACE FUNCTION public.saved_candidates_job_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.job_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.job_id IS DISTINCT FROM OLD.job_id) AND NOT public.owns_job(NEW.job_id) THEN
    RAISE EXCEPTION 'You can only save candidates to your own jobs';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.saved_candidates_job_guard() FROM anon, authenticated, public;
DROP TRIGGER IF EXISTS saved_candidates_job_guard ON public.saved_candidates;
CREATE TRIGGER saved_candidates_job_guard BEFORE INSERT OR UPDATE ON public.saved_candidates FOR EACH ROW EXECUTE FUNCTION public.saved_candidates_job_guard();