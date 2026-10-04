ALTER TABLE public.recruiter_profiles
  ADD COLUMN IF NOT EXISTS secondary_specializations text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_candidate_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS industry_specializations text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS roles_recruited text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS experience_levels text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS geographic_regions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS work_arrangements text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_contact_method text NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS notify_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_candidates boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_applications boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_pipeline boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS recruiter_visibility text NOT NULL DEFAULT 'active'
    CHECK (recruiter_visibility IN ('active','browsing','hiring_now'));

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS why_work_here text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS hiring_regions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_work_arrangements text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS primary_technical_roles text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hiring_volume text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS headquarters text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS gallery_urls text[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.company_recruiters(_company uuid)
RETURNS TABLE (user_id uuid, first_name text, last_name text, title text, specialization text, location text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.user_id, p.first_name, p.last_name, r.title, r.specialization, r.location
  FROM public.recruiter_profiles r JOIN public.profiles p ON p.user_id = r.user_id
  WHERE r.company_id = _company AND auth.uid() IS NOT NULL
  ORDER BY p.first_name
$$;
REVOKE ALL ON FUNCTION public.company_recruiters(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.company_recruiters(uuid) TO authenticated;

CREATE POLICY "Recruiters upload own branding" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-branding' AND (storage.foldername(name))[1] = auth.uid()::text AND public.has_role(auth.uid(), 'recruiter'));
CREATE POLICY "Recruiters update own branding" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'company-branding' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Recruiters delete own branding" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'company-branding' AND (storage.foldername(name))[1] = auth.uid()::text);