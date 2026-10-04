ALTER TABLE public.candidate_profiles
  ADD COLUMN resume_path text,
  ADD COLUMN resume_file_name text,
  ADD COLUMN resume_uploaded_at timestamptz,
  ADD COLUMN locations_of_interest text[] NOT NULL DEFAULT '{}',
  ADD COLUMN target_industries text[] NOT NULL DEFAULT '{}',
  ADD COLUMN hide_from_current_employer boolean NOT NULL DEFAULT false;
ALTER TABLE public.work_experience
  ADD COLUMN location text NOT NULL DEFAULT '',
  ADD COLUMN achievements text NOT NULL DEFAULT '';
ALTER TABLE public.certifications
  ADD COLUMN certification_number text NOT NULL DEFAULT '';

CREATE POLICY "Candidates read own resume" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Candidates upload own resume" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text AND public.has_role(auth.uid(),'candidate'));
CREATE POLICY "Candidates update own resume" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Candidates delete own resume" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);