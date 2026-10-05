ALTER TABLE public.candidate_profiles ADD COLUMN IF NOT EXISTS photo_visible boolean NOT NULL DEFAULT true;
CREATE OR REPLACE FUNCTION public.candidate_avatars(_ids uuid[])
RETURNS TABLE(user_id uuid, avatar_path text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT p.user_id, p.avatar_path FROM public.profiles p
  JOIN public.candidate_profiles cp ON cp.user_id = p.user_id
  WHERE p.user_id = ANY(_ids) AND p.avatar_path IS NOT NULL AND cp.photo_visible
    AND public.recruiter_can_view_candidate(p.user_id)
$$;