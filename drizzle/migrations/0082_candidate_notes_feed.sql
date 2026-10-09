CREATE OR REPLACE FUNCTION public.candidate_notes_feed(_candidate uuid)
RETURNS TABLE(note_id uuid, author_id uuid, author_name text, job_id uuid, job_title text, content text, created_at timestamptz, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT n.note_id, n.author_id, public.person_name(n.author_id), n.job_id, j.job_title, n.content, n.created_at, n.updated_at
  FROM candidate_notes n LEFT JOIN jobs j ON j.job_id = n.job_id
  WHERE n.candidate_id = _candidate
    AND public.has_role(auth.uid(), 'recruiter')
    AND public.recruiter_can_view_candidate(_candidate)
    AND public.can_read_candidate_note(n.author_id, n.job_id)
  ORDER BY n.created_at DESC
  LIMIT 200
$$;
REVOKE EXECUTE ON FUNCTION public.candidate_notes_feed(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.candidate_notes_feed(uuid) TO authenticated;