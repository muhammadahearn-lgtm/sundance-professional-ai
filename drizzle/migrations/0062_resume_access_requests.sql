ALTER TABLE public.candidate_profiles ADD COLUMN require_resume_request boolean NOT NULL DEFAULT true;

CREATE TABLE public.resume_access_requests (
  request_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL,
  candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(user_id) ON DELETE CASCADE,
  message text NOT NULL DEFAULT '' CHECK (char_length(message) <= 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  expires_at timestamptz
);
CREATE UNIQUE INDEX resume_access_requests_pending_uq ON public.resume_access_requests (recruiter_id, candidate_id) WHERE status = 'pending';
GRANT SELECT ON public.resume_access_requests TO authenticated;
GRANT ALL ON public.resume_access_requests TO service_role;
ALTER TABLE public.resume_access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read resume requests" ON public.resume_access_requests FOR SELECT TO authenticated
  USING (auth.uid() = recruiter_id OR auth.uid() = candidate_id);

CREATE TABLE public.resume_downloads (
  download_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL,
  candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(user_id) ON DELETE CASCADE,
  reason text NOT NULL,
  resume_kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX resume_downloads_candidate_idx ON public.resume_downloads (candidate_id, created_at DESC);
GRANT SELECT ON public.resume_downloads TO authenticated;
GRANT ALL ON public.resume_downloads TO service_role;
ALTER TABLE public.resume_downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Candidates read own resume downloads" ON public.resume_downloads FOR SELECT TO authenticated
  USING (auth.uid() = candidate_id);

CREATE OR REPLACE FUNCTION public.resume_access_reason(_candidate uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'recruiter') THEN RETURN NULL; END IF;
  IF public.applied_to_my_job(_candidate) THEN RETURN 'applicant'; END IF;
  IF NOT public.recruiter_can_view_candidate(_candidate) THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM public.resume_access_requests r WHERE r.candidate_id = _candidate AND r.recruiter_id = auth.uid()
             AND r.status = 'approved' AND (r.expires_at IS NULL OR r.expires_at > now())) THEN RETURN 'approved_request'; END IF;
  IF EXISTS (SELECT 1 FROM public.candidate_profiles c WHERE c.user_id = _candidate AND NOT c.require_resume_request) THEN RETURN 'open_access'; END IF;
  RETURN NULL;
END; $$;
REVOKE EXECUTE ON FUNCTION public.resume_access_reason(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.resume_access_reason(uuid) TO authenticated;

DROP POLICY IF EXISTS "Recruiters read visible candidate resumes" ON storage.objects;
DROP POLICY IF EXISTS "Recruiters read applicant resumes" ON storage.objects;
CREATE POLICY "Recruiters read permitted candidate resumes" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'resumes' AND public.has_role(auth.uid(), 'recruiter')
         AND public.resume_access_reason(((storage.foldername(name))[1])::uuid) IS NOT NULL);

CREATE OR REPLACE FUNCTION public.log_resume_download(_candidate uuid, _kind text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _reason text := public.resume_access_reason(_candidate);
BEGIN
  IF _reason IS NULL THEN RAISE EXCEPTION 'Resume access requires the candidate''s permission'; END IF;
  INSERT INTO public.resume_downloads (recruiter_id, candidate_id, reason, resume_kind)
  VALUES (auth.uid(), _candidate, _reason, CASE WHEN _kind = 'standard' THEN 'standard' ELSE 'original' END);
  RETURN _reason;
END; $$;
REVOKE EXECUTE ON FUNCTION public.log_resume_download(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.log_resume_download(uuid, text) TO authenticated;

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
  PERFORM public.create_notification(_candidate, 'candidate', 'resume_request', 'recruiter', 'Resume request',
    coalesce(public.person_name(auth.uid()), 'A recruiter') || ' asked to download your resume.', '/candidate/profile', 'medium', 'resume_request:' || _id);
  RETURN _id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.request_resume_access(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.request_resume_access(uuid, text) TO authenticated;

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
  PERFORM public.create_notification(r.recruiter_id, 'recruiter', 'resume_request_response', 'recruiter',
    CASE WHEN _approve THEN 'Resume request approved' ELSE 'Resume request declined' END,
    coalesce(public.person_name(auth.uid()), 'The candidate') || CASE WHEN _approve THEN ' approved your resume request (valid 30 days).' ELSE ' declined your resume request.' END,
    '/recruiter/talent', 'medium', 'resume_response:' || _request);
END; $$;
REVOKE EXECUTE ON FUNCTION public.respond_resume_request(uuid, boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.respond_resume_request(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.my_resume_activity()
RETURNS TABLE(kind text, id uuid, recruiter_name text, company_name text, status text, message text, reason text, created_at timestamptz, expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 'request', r.request_id, public.person_name(r.recruiter_id), rp.company_name, r.status, r.message, NULL, r.created_at, r.expires_at
  FROM public.resume_access_requests r LEFT JOIN public.recruiter_profiles rp ON rp.user_id = r.recruiter_id
  WHERE r.candidate_id = auth.uid()
  UNION ALL
  SELECT 'download', d.download_id, public.person_name(d.recruiter_id), rp.company_name, NULL, NULL, d.reason, d.created_at, NULL
  FROM public.resume_downloads d LEFT JOIN public.recruiter_profiles rp ON rp.user_id = d.recruiter_id
  WHERE d.candidate_id = auth.uid()
  ORDER BY 8 DESC LIMIT 100
$$;
REVOKE EXECUTE ON FUNCTION public.my_resume_activity() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.my_resume_activity() TO authenticated;