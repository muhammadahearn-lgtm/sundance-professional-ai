DROP POLICY IF EXISTS "Signed-in read companies" ON public.companies;
CREATE POLICY "Read companies with active jobs or own company" ON public.companies FOR SELECT TO authenticated USING (
  created_by = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.company_id = companies.company_id
      AND j.job_status = 'active'::public.job_status
  )
);