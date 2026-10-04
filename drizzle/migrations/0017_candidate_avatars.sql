CREATE OR REPLACE FUNCTION public.candidate_avatars(_ids uuid[])
RETURNS TABLE(user_id uuid, avatar_path text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id, p.avatar_path FROM public.profiles p
  WHERE p.user_id = ANY(_ids) AND p.avatar_path IS NOT NULL AND public.recruiter_can_view_candidate(p.user_id)
$$;
REVOKE EXECUTE ON FUNCTION public.candidate_avatars(uuid[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.candidate_avatars(uuid[]) TO authenticated;