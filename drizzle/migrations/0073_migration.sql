ALTER TABLE public.applications
  ADD COLUMN withdrawn_at timestamptz,
  ADD COLUMN withdraw_reason text NOT NULL DEFAULT '' CHECK (length(withdraw_reason) <= 60),
  ADD COLUMN withdraw_note text NOT NULL DEFAULT '' CHECK (length(withdraw_note) <= 500);

CREATE OR REPLACE FUNCTION public.withdraw_application(_application uuid, _reason text, _note text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE a public.applications; j record; cname text; lbl text;
BEGIN
  SELECT * INTO a FROM public.applications WHERE application_id = _application FOR UPDATE;
  IF NOT FOUND OR a.candidate_id <> auth.uid() THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF a.application_status IN ('hired','rejected') OR a.withdrawn_at IS NOT NULL THEN RAISE EXCEPTION 'This application can no longer be withdrawn'; END IF;
  IF _reason NOT IN ('accepted_other_offer','compensation','timing','role_fit','location','other') THEN RAISE EXCEPTION 'Please choose a reason'; END IF;
  lbl := CASE _reason WHEN 'accepted_other_offer' THEN 'Accepted another offer' WHEN 'compensation' THEN 'Compensation mismatch'
    WHEN 'timing' THEN 'Personal or timing reasons' WHEN 'role_fit' THEN 'Role is not the right fit' WHEN 'location' THEN 'Location or work arrangement' ELSE 'Other' END;

  UPDATE public.applications SET withdrawn_at = now(), withdraw_reason = _reason, withdraw_note = left(coalesce(_note,''), 500),
    application_status = 'rejected' WHERE application_id = _application;
  UPDATE public.job_offers SET status = 'withdrawn' WHERE job_id = a.job_id AND candidate_id = a.candidate_id AND status = 'pending';
  UPDATE public.interviews SET status = 'cancelled' WHERE candidate_id = a.candidate_id AND (application_id = _application OR job_id = a.job_id)
    AND status = 'scheduled' AND scheduled_at > now();
  UPDATE public.recruiting_pipeline SET current_stage = 'rejected' WHERE job_id = a.job_id AND candidate_id = a.candidate_id AND current_stage NOT IN ('hired','rejected');

  SELECT jb.job_title, jb.recruiter_id INTO j FROM public.jobs jb WHERE jb.job_id = a.job_id;
  cname := coalesce(public.person_name(a.candidate_id), 'A candidate');
  PERFORM public.create_notification(j.recruiter_id, 'recruiter', 'application_withdrawn', 'application', 'Candidate withdrew',
    cname || ' withdrew from ' || j.job_title || ' — ' || lbl || '.',
    '/recruiter/pipeline/' || a.job_id || '?candidate=' || a.candidate_id, 'high', 'app:' || _application || ':withdrawn');
END $$;
REVOKE ALL ON FUNCTION public.withdraw_application(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.withdraw_application(uuid, text, text) TO authenticated;

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
    IF NEW.withdrawn_at IS NOT NULL THEN RETURN NEW; END IF;
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