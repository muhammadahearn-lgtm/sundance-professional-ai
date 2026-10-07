CREATE OR REPLACE FUNCTION public.candidate_visible_to_recruiters(_candidate uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.candidate_profiles cp
    WHERE cp.user_id = _candidate
      AND cp.visibility_status IN ('public','recruiter_searchable')
      AND NOT (
        cp.hide_from_current_employer AND btrim(cp.current_employer) <> '' AND EXISTS (
          SELECT 1 FROM public.recruiter_profiles rp
          LEFT JOIN public.companies c ON c.company_id = rp.company_id
          WHERE rp.user_id = auth.uid()
            AND public.company_key(cp.current_employer) IN (public.company_key(rp.company_name), public.company_key(coalesce(c.company_name, '')))
        )
      )
  )
$$;