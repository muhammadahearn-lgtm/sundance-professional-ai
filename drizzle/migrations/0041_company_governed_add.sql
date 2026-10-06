CREATE OR REPLACE FUNCTION public.company_key(_v text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT trim(regexp_replace(
    regexp_replace(lower(coalesce(_v,'')), '[^a-z0-9& ]+', ' ', 'g') || ' ',
    '\s(inc|incorporated|llc|l l c|ltd|limited|corp|corporation|co|company|plc|gmbh|sa|ag|bv|pty|pte)\s', ' ', 'g'))
$$;
REVOKE EXECUTE ON FUNCTION public.company_key(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.company_key(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.add_company_entry(_name text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n text := regexp_replace(trim(coalesce(_name,'')), '\s+', ' ', 'g'); k text; cid uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'recruiter') THEN RAISE EXCEPTION 'Only recruiters can add companies'; END IF;
  IF length(n) < 2 OR length(n) > 80 THEN RAISE EXCEPTION 'Company name must be 2–80 characters'; END IF;
  k := regexp_replace(public.company_key(n), '\s+', '', 'g');
  IF k = '' THEN RAISE EXCEPTION 'Enter a valid company name'; END IF;
  SELECT company_id INTO cid FROM public.companies WHERE regexp_replace(public.company_key(company_name), '\s+', '', 'g') = k ORDER BY created_at LIMIT 1;
  IF cid IS NOT NULL THEN RETURN cid; END IF;
  INSERT INTO public.companies (company_name, created_by) VALUES (n, auth.uid()) RETURNING company_id INTO cid;
  RETURN cid;
END $$;
REVOKE EXECUTE ON FUNCTION public.add_company_entry(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_company_entry(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.my_job_companies() RETURNS TABLE(company_id uuid, company_name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT c.company_id, c.company_name FROM public.companies c
  WHERE public.has_role(auth.uid(),'recruiter') AND (
    c.created_by = auth.uid()
    OR c.company_id IN (SELECT company_id FROM public.recruiter_profiles WHERE user_id = auth.uid())
    OR c.company_id IN (SELECT company_id FROM public.jobs WHERE recruiter_id = auth.uid()))
  ORDER BY c.company_name
$$;
REVOKE EXECUTE ON FUNCTION public.my_job_companies() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_job_companies() TO authenticated;