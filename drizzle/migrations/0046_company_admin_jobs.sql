CREATE OR REPLACE FUNCTION public.company_admin_jobs(_company uuid)
RETURNS TABLE(job_id uuid, job_title text, job_status text, recruiter_id uuid, recruiter_name text, created_at timestamptz, published_at timestamptz,
  applicants bigint, saved bigint, contacted bigint, interviewing bigint, shortlisted bigint, offer bigint, hired bigint, rejected bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT j.job_id, j.job_title, j.job_status::text, j.recruiter_id, public.person_name(j.recruiter_id), j.created_at, j.published_at,
    (SELECT count(*) FROM public.applications a WHERE a.job_id = j.job_id),
    count(p.*) FILTER (WHERE p.current_stage = 'saved'),
    count(p.*) FILTER (WHERE p.current_stage = 'contacted'),
    count(p.*) FILTER (WHERE p.current_stage = 'interviewing'),
    count(p.*) FILTER (WHERE p.current_stage = 'shortlisted'),
    count(p.*) FILTER (WHERE p.current_stage = 'offer'),
    count(p.*) FILTER (WHERE p.current_stage = 'hired'),
    count(p.*) FILTER (WHERE p.current_stage = 'rejected')
  FROM public.jobs j
  LEFT JOIN public.recruiting_pipeline p ON p.job_id = j.job_id
  WHERE j.company_id = _company AND public.is_company_admin(_company, auth.uid())
  GROUP BY j.job_id
  ORDER BY j.created_at DESC
$$;
REVOKE EXECUTE ON FUNCTION public.company_admin_jobs(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.company_admin_jobs(uuid) TO authenticated;