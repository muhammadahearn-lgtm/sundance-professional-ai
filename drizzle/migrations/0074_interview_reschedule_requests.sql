ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS reschedule_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS reschedule_note text NOT NULL DEFAULT '' CHECK (char_length(reschedule_note) <= 500),
  ADD COLUMN IF NOT EXISTS cancelled_by text NOT NULL DEFAULT '' CHECK (cancelled_by IN ('', 'candidate', 'recruiter')),
  ADD COLUMN IF NOT EXISTS cancel_reason text NOT NULL DEFAULT '' CHECK (char_length(cancel_reason) <= 500);

-- A new time (or recruiter cancellation) clears any open reschedule request.
CREATE OR REPLACE FUNCTION public.interviews_clear_request() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at OR (NEW.status = 'cancelled' AND OLD.status <> 'cancelled') THEN
    NEW.reschedule_requested_at := NULL;
    IF NEW.status <> 'cancelled' THEN NEW.reschedule_note := ''; END IF;
  END IF;
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' AND NEW.cancelled_by = '' THEN NEW.cancelled_by := 'recruiter'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.interviews_clear_request() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS interviews_clear_request ON public.interviews;
CREATE TRIGGER interviews_clear_request BEFORE UPDATE ON public.interviews FOR EACH ROW EXECUTE FUNCTION public.interviews_clear_request();

CREATE OR REPLACE FUNCTION public.notify_interview() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t text; url text; who text; rurl text;
BEGIN
  rurl := CASE WHEN NEW.job_id IS NOT NULL THEN '/recruiter/pipeline/' || NEW.job_id || '?candidate=' || NEW.candidate_id ELSE '/recruiter/interviews' END;
  -- Candidate asked for a new time: tell the recruiter.
  IF TG_OP = 'UPDATE' AND NEW.reschedule_requested_at IS NOT NULL AND OLD.reschedule_requested_at IS DISTINCT FROM NEW.reschedule_requested_at THEN
    who := coalesce(public.person_name(NEW.candidate_id), 'A candidate');
    PERFORM public.create_notification(NEW.recruiter_id, 'recruiter', 'interview_reschedule', 'pipeline', 'Reschedule Requested',
      who || ' asked to move the interview on ' || to_char(NEW.scheduled_at AT TIME ZONE NEW.timezone, 'Mon DD, HH12:MI AM') || CASE WHEN NEW.reschedule_note <> '' THEN ': "' || left(NEW.reschedule_note, 140) || '"' ELSE '' END,
      '/recruiter/interviews', 'high', 'interview-resched:' || NEW.interview_id || ':' || extract(epoch from NEW.reschedule_requested_at)::bigint);
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.scheduled_at = OLD.scheduled_at AND NEW.status = OLD.status AND NEW.meeting_url = OLD.meeting_url AND NEW.location_address = OLD.location_address THEN RETURN NEW; END IF;
  -- Candidate cancelled: tell the recruiter, not the candidate.
  IF NEW.status = 'cancelled' AND NEW.cancelled_by = 'candidate' THEN
    who := coalesce(public.person_name(NEW.candidate_id), 'A candidate');
    PERFORM public.create_notification(NEW.recruiter_id, 'recruiter', 'interview', 'pipeline', 'Interview Cancelled by Candidate',
      who || ' cancelled the interview on ' || to_char(NEW.scheduled_at AT TIME ZONE NEW.timezone, 'Mon DD, HH12:MI AM') || CASE WHEN NEW.cancel_reason <> '' THEN ': "' || left(NEW.cancel_reason, 140) || '"' ELSE '' END,
      rurl, 'high', 'interview:' || NEW.interview_id || ':cancel');
    RETURN NEW;
  END IF;
  t := CASE WHEN NEW.status = 'cancelled' THEN 'Interview Cancelled' WHEN TG_OP = 'INSERT' THEN 'Interview Scheduled' WHEN NEW.scheduled_at <> OLD.scheduled_at THEN 'Interview Rescheduled' ELSE 'Interview Updated' END;
  url := CASE WHEN NEW.application_id IS NOT NULL THEN '/candidate/applications/' || NEW.application_id ELSE '/candidate/applications' END;
  PERFORM public.create_notification(NEW.candidate_id, 'candidate', 'interview', 'pipeline', t,
    (CASE WHEN NEW.format = 'online' THEN 'Online interview on ' ELSE 'In-person interview on ' END) || to_char(NEW.scheduled_at AT TIME ZONE NEW.timezone, 'Mon DD, HH12:MI AM') || ' (' || NEW.timezone || ')',
    url, 'high', 'interview:' || NEW.interview_id || ':' || extract(epoch from NEW.updated_at)::bigint);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_interview() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.request_interview_reschedule(_interview uuid, _note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.interviews;
BEGIN
  SELECT * INTO r FROM public.interviews WHERE interview_id = _interview FOR UPDATE;
  IF r.interview_id IS NULL OR r.candidate_id <> auth.uid() THEN RAISE EXCEPTION 'Interview not found'; END IF;
  IF r.status = 'cancelled' THEN RAISE EXCEPTION 'This interview was cancelled'; END IF;
  IF r.scheduled_at <= now() THEN RAISE EXCEPTION 'Only upcoming interviews can be rescheduled'; END IF;
  IF char_length(coalesce(_note, '')) > 500 THEN RAISE EXCEPTION 'Note must be 500 characters or fewer'; END IF;
  UPDATE public.interviews SET reschedule_requested_at = now(), reschedule_note = trim(coalesce(_note, '')), updated_at = now() WHERE interview_id = _interview;
END $$;

CREATE OR REPLACE FUNCTION public.candidate_cancel_interview(_interview uuid, _reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.interviews;
BEGIN
  SELECT * INTO r FROM public.interviews WHERE interview_id = _interview FOR UPDATE;
  IF r.interview_id IS NULL OR r.candidate_id <> auth.uid() THEN RAISE EXCEPTION 'Interview not found'; END IF;
  IF r.status = 'cancelled' THEN RETURN; END IF;
  IF r.scheduled_at <= now() THEN RAISE EXCEPTION 'Only upcoming interviews can be cancelled'; END IF;
  IF char_length(trim(coalesce(_reason, ''))) < 3 THEN RAISE EXCEPTION 'Please add a short reason'; END IF;
  IF char_length(_reason) > 500 THEN RAISE EXCEPTION 'Reason must be 500 characters or fewer'; END IF;
  UPDATE public.interviews SET status = 'cancelled', cancelled_by = 'candidate', cancel_reason = trim(_reason), updated_at = now() WHERE interview_id = _interview;
END $$;

REVOKE ALL ON FUNCTION public.request_interview_reschedule(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.candidate_cancel_interview(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_interview_reschedule(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.candidate_cancel_interview(uuid, text) TO authenticated;