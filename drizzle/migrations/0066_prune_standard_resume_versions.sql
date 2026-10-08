CREATE OR REPLACE FUNCTION public.prune_standard_resume_versions(_keep integer DEFAULT 3)
RETURNS SETOF text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  RETURN QUERY
  DELETE FROM public.standard_resume_versions v
  WHERE v.candidate_id = auth.uid()
    AND v.standard_resume_id IN (
      SELECT standard_resume_id FROM public.standard_resume_versions
      WHERE candidate_id = auth.uid()
      ORDER BY version_number DESC
      OFFSET GREATEST(_keep, 1)
    )
  RETURNING v.pdf_path;
END;
$$;
REVOKE ALL ON FUNCTION public.prune_standard_resume_versions(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prune_standard_resume_versions(integer) TO authenticated;