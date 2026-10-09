ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS headcount integer NOT NULL DEFAULT 1;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_headcount_range CHECK (headcount BETWEEN 1 AND 99);

CREATE OR REPLACE FUNCTION public.respond_to_offer(_offer uuid, _accept boolean, _reason text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.job_offers; jt text; hc int; nh int;
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
    SELECT job_title, headcount INTO jt, hc FROM public.jobs WHERE job_id = o.job_id;
    SELECT count(DISTINCT candidate_id) INTO nh FROM public.recruiting_pipeline WHERE job_id = o.job_id AND current_stage = 'hired';
    IF nh >= coalesce(hc, 1) THEN
      UPDATE public.applications SET application_status = 'rejected'
        WHERE job_id = o.job_id AND candidate_id <> o.candidate_id
          AND application_status IN ('applied','viewed','recruiter_contacted','interviewing','offer');
      UPDATE public.recruiting_pipeline SET current_stage = 'rejected'
        WHERE job_id = o.job_id AND current_stage NOT IN ('hired','rejected');
      UPDATE public.job_offers SET status = 'withdrawn'
        WHERE job_id = o.job_id AND candidate_id <> o.candidate_id AND status = 'pending';
      UPDATE public.jobs SET job_status = 'closed' WHERE job_id = o.job_id AND job_status <> 'closed';
      PERFORM public.create_notification(o.recruiter_id, 'recruiter', 'job_filled', 'pipeline', 'Role filled and closed',
        coalesce(public.person_name(o.candidate_id), 'Your candidate') || ' is hired for ' || coalesce(jt, 'the role') ||
        CASE WHEN hc > 1 THEN '. All ' || hc || ' openings are filled' ELSE '' END || '. The job is closed and other applicants were kindly updated.',
        '/recruiter/pipeline/' || o.job_id, 'high', 'job_filled:' || o.job_id);
    ELSE
      PERFORM public.create_notification(o.recruiter_id, 'recruiter', 'job_filled', 'pipeline', 'Offer accepted',
        coalesce(public.person_name(o.candidate_id), 'Your candidate') || ' is hired for ' || coalesce(jt, 'the role') || '. ' || nh || ' of ' || hc || ' spots filled (' || (hc - nh) || ' still open). The job stays active.',
        '/recruiter/pipeline/' || o.job_id, 'high', 'job_hire:' || o.offer_id);
    END IF;
  END IF;
  PERFORM set_config('app.offer_respond', 'off', true);
END $$;
REVOKE EXECUTE ON FUNCTION public.respond_to_offer(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_offer(uuid, boolean, text) TO authenticated;