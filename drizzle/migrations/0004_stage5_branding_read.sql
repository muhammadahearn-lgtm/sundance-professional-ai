CREATE POLICY "Signed-in read branding" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'company-branding');
COMMENT ON COLUMN public.companies.logo_url IS 'Storage path in company-branding bucket';
COMMENT ON COLUMN public.companies.banner_url IS 'Storage path in company-branding bucket';