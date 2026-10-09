ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS reneged_at timestamptz,
  ADD COLUMN IF NOT EXISTS renege_reason text NOT NULL DEFAULT '' CHECK (length(renege_reason) <= 60),
  ADD COLUMN IF NOT EXISTS renege_note text NOT NULL DEFAULT '' CHECK (length(renege_note) <= 1000);

-- Recruiter records that a hired candidate backed out: frees the seat, optionally reopens the job.
CREATE OR REPLACE FUNCTION public.record_hire_renege(_job uuid, _candidate uuid, _reason text, _note text DEFAULT '', _reopen boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p public.recruiting_pipeline; js public.job_status;
BEGIN
  IF NOT public.owns_job(_job) THEN RAISE EXCEPTION 'Access denied'; END IF;
  IF _reason NOT IN ('counter_offer','personal','visa','compensation','no_show','other') THEN RAISE EXCEPTION 'Please choose a reason'; END IF;
  SELECT * INTO p FROM public.recruiting_pipeline WHERE job_id = _job AND candidate_id = _candidate FOR UPDATE;
  IF NOT FOUND OR p.current_stage <> 'hired' THEN RAISE EXCEPTION 'This candidate is not marked hired for this job'; END IF;
  SELECT job_status INTO js FROM public.jobs WHERE job_id = _job;
  IF _reopen AND js = 'closed' THEN UPDATE public.jobs SET job_status = 'active' WHERE job_id = _job; END IF;
  UPDATE public.applications SET reneged_at = now(), renege_reason = _reason, renege_note = left(coalesce(_note,''), 1000),
    application_status = 'rejected' WHERE job_id = _job AND candidate_id = _candidate;
  UPDATE public.job_offers SET status = 'withdrawn' WHERE job_id = _job AND candidate_id = _candidate AND status IN ('pending','accepted');
  PERFORM set_config('app.offer_respond', 'on', true);
  UPDATE public.recruiting_pipeline SET current_stage = 'rejected' WHERE pipeline_id = p.pipeline_id;
  PERFORM set_config('app.offer_respond', '', true);
END $$;
REVOKE ALL ON FUNCTION public.record_hire_renege(uuid, uuid, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_hire_renege(uuid, uuid, text, text, boolean) TO authenticated;

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