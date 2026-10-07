CREATE POLICY "Creators update unclaimed client companies" ON public.companies FOR UPDATE TO authenticated
USING (created_by = auth.uid() AND NOT EXISTS (SELECT 1 FROM public.company_members m WHERE m.company_id = companies.company_id))
WITH CHECK (created_by = auth.uid());