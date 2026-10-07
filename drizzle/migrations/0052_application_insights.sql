CREATE OR REPLACE FUNCTION public.get_candidate_application_insights(_application uuid)
RETURNS TABLE(total_applicants bigint, in_review bigint, interviewing bigint, offers bigint, not_moving_forward bigint, active_pool bigint, your_status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT job_id, application_status FROM applications WHERE application_id = _application AND candidate_id = auth.uid())
  SELECT count(*),
    count(*) FILTER (WHERE a.application_status IN ('viewed','recruiter_contacted')),
    count(*) FILTER (WHERE a.application_status = 'interviewing'),
    count(*) FILTER (WHERE a.application_status IN ('offer','hired')),
    count(*) FILTER (WHERE a.application_status = 'rejected'),
    count(*) FILTER (WHERE a.application_status <> 'rejected'),
    (SELECT application_status::text FROM me)
  FROM applications a JOIN me ON a.job_id = me.job_id;
$$;
REVOKE ALL ON FUNCTION public.get_candidate_application_insights(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_candidate_application_insights(uuid) TO authenticated;