CREATE TABLE public.interviews (
  interview_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid REFERENCES public.recruiting_pipeline(pipeline_id) ON DELETE SET NULL,
  application_id uuid REFERENCES public.applications(application_id) ON DELETE CASCADE,
  recruiter_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  job_id uuid REFERENCES public.jobs(job_id) ON DELETE CASCADE,
  format text NOT NULL CHECK (format IN ('online','in_person')),
  interview_type text NOT NULL DEFAULT 'screen',
  platform text NOT NULL DEFAULT '',
  meeting_url text NOT NULL DEFAULT '',
  location_address text NOT NULL DEFAULT '',
  location_instructions text NOT NULL DEFAULT '',
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 45,
  timezone text NOT NULL DEFAULT 'UTC',
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interviews TO authenticated;
GRANT ALL ON public.interviews TO service_role;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recruiters manage own interviews" ON public.interviews FOR ALL TO authenticated
  USING (recruiter_id = auth.uid())
  WITH CHECK (recruiter_id = auth.uid() AND (job_id IS NULL OR public.owns_job(job_id)));
CREATE POLICY "Candidates read own interviews" ON public.interviews FOR SELECT TO authenticated
  USING (candidate_id = auth.uid());
CREATE INDEX interviews_candidate_idx ON public.interviews(candidate_id);
CREATE INDEX interviews_recruiter_idx ON public.interviews(recruiter_id);

CREATE OR REPLACE FUNCTION public.interviews_validate() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.format = 'online' AND NEW.meeting_url !~* '^https://' THEN RAISE EXCEPTION 'Please add a meeting link starting with https://'; END IF;
  IF NEW.format = 'in_person' AND length(trim(NEW.location_address)) < 5 THEN RAISE EXCEPTION 'Please add the interview address'; END IF;
  IF NEW.duration_minutes < 10 OR NEW.duration_minutes > 480 THEN RAISE EXCEPTION 'Duration must be between 10 and 480 minutes'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER interviews_validate BEFORE INSERT OR UPDATE ON public.interviews FOR EACH ROW EXECUTE FUNCTION public.interviews_validate();

CREATE OR REPLACE FUNCTION public.notify_interview() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t text; url text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.scheduled_at = OLD.scheduled_at AND NEW.status = OLD.status AND NEW.meeting_url = OLD.meeting_url AND NEW.location_address = OLD.location_address THEN RETURN NEW; END IF;
  t := CASE WHEN NEW.status = 'cancelled' THEN 'Interview Cancelled' WHEN TG_OP = 'INSERT' THEN 'Interview Scheduled' ELSE 'Interview Updated' END;
  url := CASE WHEN NEW.application_id IS NOT NULL THEN '/candidate/applications/' || NEW.application_id ELSE '/candidate/applications' END;
  PERFORM public.create_notification(NEW.candidate_id, 'candidate', 'interview', 'pipeline', t,
    (CASE WHEN NEW.format = 'online' THEN 'Online interview on ' ELSE 'In-person interview on ' END) || to_char(NEW.scheduled_at AT TIME ZONE NEW.timezone, 'Mon DD, HH12:MI AM') || ' (' || NEW.timezone || ')',
    url, 'high', 'interview:' || NEW.interview_id || ':' || extract(epoch from NEW.updated_at)::bigint);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_interview() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.interviews_validate() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER notify_interview AFTER INSERT OR UPDATE ON public.interviews FOR EACH ROW EXECUTE FUNCTION public.notify_interview();