ALTER TABLE public.jobs ADD COLUMN max_applications integer CHECK (max_applications IS NULL OR max_applications BETWEEN 1 AND 10000);

CREATE OR REPLACE FUNCTION public.auto_pause_job_at_cap()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cap integer; _rec uuid; _title text; _n bigint;
BEGIN
  SELECT max_applications, recruiter_id, job_title INTO _cap, _rec, _title FROM jobs WHERE job_id = NEW.job_id AND job_status = 'active';
  IF _cap IS NULL THEN RETURN NEW; END IF;
  SELECT count(*) INTO _n FROM applications WHERE job_id = NEW.job_id;
  IF _n >= _cap THEN
    UPDATE jobs SET job_status = 'paused' WHERE job_id = NEW.job_id;
    PERFORM create_notification(_rec, 'recruiter', 'job_cap_reached', 'application',
      'Applicant limit reached',
      format('"%s" reached %s applicants and was paused so you can review your pool. Raise the limit and resume anytime.', _title, _cap),
      '/recruiter/jobs/' || NEW.job_id, 'high', 'job_cap:' || NEW.job_id || ':' || _cap);
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.auto_pause_job_at_cap() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER applications_auto_pause_at_cap AFTER INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.auto_pause_job_at_cap();