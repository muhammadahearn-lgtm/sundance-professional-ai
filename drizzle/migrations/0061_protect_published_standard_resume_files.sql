CREATE POLICY "Published standard resumes are immutable on update"
  ON storage.objects
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (
    NOT (
      bucket_id = 'resumes'
      AND (storage.foldername(name))[2] = 'standard'
    )
  );

CREATE POLICY "Published standard resumes are immutable on delete"
  ON storage.objects
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (
    NOT (
      bucket_id = 'resumes'
      AND (storage.foldername(name))[2] = 'standard'
    )
  );