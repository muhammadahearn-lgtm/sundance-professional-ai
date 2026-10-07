ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS is_catalog boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_companies_catalog ON public.companies(is_catalog) WHERE is_catalog;
CREATE POLICY "Read catalog companies" ON public.companies FOR SELECT TO authenticated USING (is_catalog);
CREATE OR REPLACE FUNCTION public.my_job_companies() RETURNS TABLE(company_id uuid, company_name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT c.company_id, c.company_name FROM public.companies c
  WHERE public.has_role(auth.uid(),'recruiter') AND (
    c.is_catalog
    OR c.created_by = auth.uid()
    OR c.company_id IN (SELECT company_id FROM public.recruiter_profiles WHERE user_id = auth.uid())
    OR c.company_id IN (SELECT company_id FROM public.jobs WHERE recruiter_id = auth.uid()))
  ORDER BY c.company_name
$$;
REVOKE EXECUTE ON FUNCTION public.my_job_companies() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_job_companies() TO authenticated;