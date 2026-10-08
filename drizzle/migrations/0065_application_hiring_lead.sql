CREATE OR REPLACE FUNCTION public.application_hiring_lead(_application_id uuid)
RETURNS TABLE (first_name text, last_name text, avatar_path text, title text, specialization text, years_experience integer, company_name text, recruiter_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.first_name, p.last_name, p.avatar_path, rp.title, rp.specialization, rp.years_experience::integer,
         COALESCE(c.company_name, rp.company_name), j.recruiter_id
  FROM applications a
  JOIN jobs j ON j.job_id = a.job_id
  JOIN profiles p ON p.user_id = j.recruiter_id
  LEFT JOIN recruiter_profiles rp ON rp.user_id = j.recruiter_id
  LEFT JOIN companies c ON c.company_id = j.company_id
  WHERE a.application_id = _application_id
    AND a.candidate_id = auth.uid()
    AND a.application_status IN ('recruiter_contacted','interviewing','offer','hired');
$$;
REVOKE ALL ON FUNCTION public.application_hiring_lead(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.application_hiring_lead(uuid) TO authenticated;