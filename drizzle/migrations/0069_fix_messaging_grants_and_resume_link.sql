GRANT EXECUTE ON FUNCTION public.my_conversations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_messages_delivered() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_conversation_archived(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_conversation(uuid, uuid) TO authenticated;

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
    '/recruiter/candidates', 'medium', 'resume_response:' || _request);
END; $$;