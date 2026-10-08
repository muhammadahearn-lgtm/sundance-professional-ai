CREATE OR REPLACE FUNCTION public.request_resume_access(_candidate uuid, _message text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'recruiter') OR NOT public.recruiter_can_view_candidate(_candidate) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF EXISTS (SELECT 1 FROM public.resume_access_requests WHERE recruiter_id = auth.uid() AND candidate_id = _candidate
             AND status = 'declined' AND responded_at > now() - interval '30 days') THEN
    RAISE EXCEPTION 'This candidate declined recently. You can ask again after 30 days.';
  END IF;
  SELECT request_id INTO _id FROM public.resume_access_requests WHERE recruiter_id = auth.uid() AND candidate_id = _candidate AND status = 'pending';
  IF _id IS NOT NULL THEN RETURN _id; END IF;
  INSERT INTO public.resume_access_requests (recruiter_id, candidate_id, message)
  VALUES (auth.uid(), _candidate, left(coalesce(_message, ''), 500)) RETURNING request_id INTO _id;
  PERFORM public.create_notification(_candidate, 'candidate', 'resume_request', 'messaging', 'Resume request',
    coalesce(public.person_name(auth.uid()), 'A recruiter') || ' asked to download your resume.', '/candidate/profile', 'medium', 'resume_request:' || _id);
  RETURN _id;
END; $$;
CREATE OR REPLACE FUNCTION public.respond_resume_request(_request uuid, _approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.resume_access_requests;
BEGIN
  SELECT * INTO r FROM public.resume_access_requests WHERE request_id = _request AND candidate_id = auth.uid() FOR UPDATE;
  IF r.request_id IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  UPDATE public.resume_access_requests SET
    status = CASE WHEN _approve THEN 'approved' ELSE 'declined' END,
    responded_at = now(),
    expires_at = CASE WHEN _approve THEN now() + interval '30 days' ELSE NULL END
  WHERE request_id = _request;
  PERFORM public.create_notification(r.recruiter_id, 'recruiter', 'resume_request_response', 'messaging',
    CASE WHEN _approve THEN 'Resume request approved' ELSE 'Resume request declined' END,
    coalesce(public.person_name(auth.uid()), 'The candidate') || CASE WHEN _approve THEN ' approved your resume request (valid 30 days).' ELSE ' declined your resume request.' END,
    '/recruiter/talent', 'medium', 'resume_response:' || _request);
END; $$;