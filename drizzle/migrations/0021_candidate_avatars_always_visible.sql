CREATE OR REPLACE FUNCTION public.candidate_avatars(_ids uuid[])
RETURNS TABLE(user_id uuid, avatar_path text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT p.user_id, p.avatar_path FROM public.profiles p
  WHERE p.user_id = ANY(_ids) AND p.avatar_path IS NOT NULL
    AND public.recruiter_can_view_candidate(p.user_id)
$$;
COMMENT ON COLUMN public.candidate_profiles.photo_visible IS 'DEPRECATED: photos are always shown to recruiters when present';