CREATE OR REPLACE FUNCTION public.pipeline_job_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF coalesce(current_setting('app.offer_respond', true), '') <> 'on' THEN
    IF NEW.job_id IS NOT NULL AND NOT public.owns_job(NEW.job_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
    IF NOT public.recruiter_can_view_candidate(NEW.candidate_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.current_stage IS DISTINCT FROM OLD.current_stage THEN NEW.stage_date = now(); END IF;
  RETURN NEW;
END $$;

-- Accept = hire: mark hired, move card to Hired, close the job, kindly wrap up everyone else.
CREATE OR REPLACE FUNCTION public.respond_to_offer(_offer uuid, _accept boolean, _reason text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.job_offers; jt text;
BEGIN
  SELECT * INTO o FROM public.job_offers WHERE offer_id = _offer FOR UPDATE;
  IF o IS NULL OR o.candidate_id <> auth.uid() THEN RAISE EXCEPTION 'Offer not found'; END IF;
  IF o.status <> 'pending' THEN RAISE EXCEPTION 'This offer is no longer open'; END IF;
  IF o.expires_on IS NOT NULL AND o.expires_on < current_date THEN RAISE EXCEPTION 'This offer has expired'; END IF;
  PERFORM set_config('app.offer_respond', 'on', true);
  UPDATE public.job_offers SET status = CASE WHEN _accept THEN 'accepted' ELSE 'declined' END,
    decline_reason = CASE WHEN _accept THEN '' ELSE left(coalesce(_reason, ''), 1000) END, responded_at = now()
  WHERE offer_id = _offer;
  IF _accept THEN
    UPDATE public.applications SET application_status = 'hired'
      WHERE job_id = o.job_id AND candidate_id = o.candidate_id AND application_status <> 'hired';
    UPDATE public.recruiting_pipeline SET current_stage = 'hired'
      WHERE job_id = o.job_id AND candidate_id = o.candidate_id AND current_stage <> 'hired';
    UPDATE public.applications SET application_status = 'rejected'
      WHERE job_id = o.job_id AND candidate_id <> o.candidate_id
        AND application_status IN ('applied','viewed','recruiter_contacted','interviewing','offer');
    UPDATE public.recruiting_pipeline SET current_stage = 'rejected'
      WHERE job_id = o.job_id AND candidate_id <> o.candidate_id AND current_stage NOT IN ('hired','rejected');
    UPDATE public.job_offers SET status = 'withdrawn'
      WHERE job_id = o.job_id AND candidate_id <> o.candidate_id AND status = 'pending';
    UPDATE public.jobs SET job_status = 'closed' WHERE job_id = o.job_id AND job_status <> 'closed';
    SELECT job_title INTO jt FROM public.jobs WHERE job_id = o.job_id;
    PERFORM public.create_notification(o.recruiter_id, 'recruiter', 'job_filled', 'pipeline', 'Role filled and closed',
      coalesce(public.person_name(o.candidate_id), 'Your candidate') || ' is hired for ' || coalesce(jt, 'the role') || '. The job is closed and other applicants were kindly updated.',
      '/recruiter/pipeline/' || o.job_id, 'high', 'job_filled:' || o.job_id);
  END IF;
  PERFORM set_config('app.offer_respond', 'off', true);
END $$;
REVOKE EXECUTE ON FUNCTION public.respond_to_offer(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_offer(uuid, boolean, text) TO authenticated;