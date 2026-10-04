ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS experience_level text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS salary_currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS bonus_info text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS benefits_summary text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

ALTER TABLE public.job_languages ADD COLUMN IF NOT EXISTS requirement_level text NOT NULL DEFAULT 'required' CHECK (requirement_level IN ('required','preferred','optional'));
ALTER TABLE public.job_skills ADD COLUMN IF NOT EXISTS requirement_level text NOT NULL DEFAULT 'required' CHECK (requirement_level IN ('required','preferred','optional'));
ALTER TABLE public.job_technologies ADD COLUMN IF NOT EXISTS requirement_level text NOT NULL DEFAULT 'required' CHECK (requirement_level IN ('required','preferred','optional'));
UPDATE public.job_languages SET requirement_level = CASE WHEN required_flag THEN 'required' ELSE 'preferred' END;
UPDATE public.job_skills SET requirement_level = CASE WHEN required_flag THEN 'required' ELSE 'preferred' END;
UPDATE public.job_technologies SET requirement_level = CASE WHEN required_flag THEN 'required' ELSE 'preferred' END;

ALTER TABLE public.jobs ADD CONSTRAINT jobs_salary_range CHECK (minimum_salary IS NULL OR maximum_salary IS NULL OR maximum_salary > minimum_salary) NOT VALID;

CREATE OR REPLACE FUNCTION public.jobs_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.job_status = 'closed' AND NEW.job_status = 'closed' THEN
    RAISE EXCEPTION 'Closed jobs are read-only';
  END IF;
  IF NEW.job_status = 'active' AND OLD.job_status <> 'active' AND NEW.published_at IS NULL THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER jobs_guard BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.jobs_guard();