ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS rejection_deliver_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_prev_stage text CHECK (rejection_prev_stage IS NULL OR char_length(rejection_prev_stage) <= 20),
  ADD COLUMN IF NOT EXISTS rejection_notified_at timestamptz;

CREATE OR REPLACE FUNCTION public.applications_rejection_schedule()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.application_status = 'rejected' AND NEW.application_status IS DISTINCT FROM 'rejected' THEN
    NEW.rejection_deliver_at := NULL; NEW.rejection_prev_stage := NULL; NEW.rejection_notified_at := NULL;
  END IF;
  IF NEW.rejection_deliver_at IS NOT NULL AND NEW.rejection_deliver_at IS DISTINCT FROM OLD.rejection_deliver_at AND NEW.rejection_deliver_at > now() + interval '3 days' THEN
    RAISE EXCEPTION 'Rejection notice can be delayed at most 3 days';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.applications_rejection_schedule() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS applications_rejection_schedule ON public.applications;
CREATE TRIGGER applications_rejection_schedule BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.applications_rejection_schedule();

CREATE OR REPLACE FUNCTION public.notify_application()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE j record; cname text; t text; ttl text; msg text; pr public.notification_priority;
BEGIN
  SELECT jb.job_title, jb.recruiter_id, coalesce(c.company_name, '') AS company INTO j
  FROM public.jobs jb LEFT JOIN public.companies c ON c.company_id = jb.company_id WHERE jb.job_id = NEW.job_id;
  cname := coalesce(public.person_name(NEW.candidate_id), 'A candidate');
  IF TG_OP = 'INSERT' THEN
    PERFORM public.create_notification(NEW.candidate_id, 'candidate', 'application_submitted', 'application', 'Application submitted',
      'Your application for ' || j.job_title || CASE WHEN j.company <> '' THEN ' at ' || j.company ELSE '' END || ' was sent. Track its progress in Applications.',
      '/candidate/applications/' || NEW.application_id, 'low', 'app:' || NEW.application_id || ':applied');
    PERFORM public.create_notification(j.recruiter_id, 'recruiter', 'new_application', 'application', 'New application',
      cname || ' applied to ' || j.job_title || '. Review their profile and match score.',
      '/recruiter/applications/' || NEW.application_id, 'high', 'app:' || NEW.application_id || ':new');
  ELSIF NEW.application_status IS DISTINCT FROM OLD.application_status THEN
    IF NEW.withdrawn_at IS NOT NULL OR NEW.reneged_at IS NOT NULL THEN RETURN NEW; END IF;
    t := NEW.application_status::text;
    IF t = 'rejected' AND NEW.rejection_deliver_at IS NOT NULL AND NEW.rejection_deliver_at > now() THEN RETURN NEW; END IF;
    SELECT x.a, x.b, x.c INTO ttl, msg, pr FROM (VALUES
      ('viewed', 'Application viewed', 'A recruiter viewed your application for ' || j.job_title || '.', 'low'::public.notification_priority),
      ('recruiter_contacted', 'Recruiter contacted you', 'A recruiter reached out about ' || j.job_title || '. Check your messages.', 'medium'),
      ('interviewing', 'Moved to interviewing', 'You moved to the interview stage for ' || j.job_title || '. Prepare and watch your messages.', 'high'),
      ('offer', 'Offer received', 'You received an offer for ' || j.job_title || '. Review the details with the recruiter.', 'high'),
      ('hired', 'You''re hired', 'Congratulations — you were hired for ' || j.job_title || '.', 'high'),
      ('rejected', 'Application update', 'The ' || j.job_title || ' role moved forward with other candidates. Explore more matching jobs.', 'medium')
    ) AS x(s, a, b, c) WHERE x.s = t;
    IF ttl IS NOT NULL THEN
      PERFORM public.create_notification(NEW.candidate_id, 'candidate', 'application_' || t, 'application', ttl, msg,
        '/candidate/applications/' || NEW.application_id, pr, 'app:' || NEW.application_id || ':' || t);
    END IF;
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.deliver_due_rejections()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE r record; n integer := 0;
BEGIN
  FOR r IN SELECT a.application_id, a.candidate_id, jb.job_title FROM public.applications a JOIN public.jobs jb ON jb.job_id = a.job_id
    WHERE a.application_status = 'rejected' AND a.rejection_deliver_at IS NOT NULL AND a.rejection_deliver_at <= now() AND a.rejection_notified_at IS NULL
      AND a.withdrawn_at IS NULL AND a.reneged_at IS NULL
    FOR UPDATE OF a SKIP LOCKED
  LOOP
    PERFORM public.create_notification(r.candidate_id, 'candidate', 'application_rejected', 'application', 'Application update',
      'The ' || r.job_title || ' role moved forward with other candidates. Explore more matching jobs.',
      '/candidate/applications/' || r.application_id, 'medium', 'app:' || r.application_id || ':rejected');
    UPDATE public.applications SET rejection_notified_at = now() WHERE application_id = r.application_id;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.deliver_due_rejections() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('deliver-due-rejections', '0 * * * *', 'SELECT public.deliver_due_rejections()');