CREATE OR REPLACE FUNCTION public.notify_reference() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE jt text;
BEGIN
  SELECT job_title INTO jt FROM public.jobs WHERE job_id = NEW.job_id;
  IF TG_TABLE_NAME = 'reference_requests' THEN
    IF TG_OP = 'INSERT' THEN
      PERFORM public.create_notification(NEW.candidate_id, 'candidate', 'reference_request', 'application',
        'References requested', 'Add ' || NEW.target_count || ' professional reference' || CASE WHEN NEW.target_count > 1 THEN 's' ELSE '' END || ' for ' || coalesce(jt,'your application') || '.',
        '/candidate/applications', 'high', 'refreq-' || NEW.request_id);
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    PERFORM public.create_notification((SELECT recruiter_id FROM public.reference_requests WHERE request_id = NEW.request_id), 'recruiter', 'reference_completed', 'pipeline',
      'Reference received', NEW.name || ' completed a reference for ' || coalesce(jt,'your job') || '.',
      '/recruiter/candidates/' || NEW.candidate_id || '?job=' || NEW.job_id, 'medium', 'refdone-' || NEW.reference_id);
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_reference() FROM PUBLIC, anon, authenticated;