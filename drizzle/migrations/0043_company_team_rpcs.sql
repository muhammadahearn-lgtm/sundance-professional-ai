-- Team listing RPCs with names, member/admin gated (person_name is not directly callable)

CREATE OR REPLACE FUNCTION public.company_team(_company uuid)
RETURNS TABLE(user_id uuid, role text, name text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.user_id, m.role, public.person_name(m.user_id), m.created_at
  FROM public.company_members m
  WHERE m.company_id = _company AND public.is_company_member(_company, auth.uid())
  ORDER BY m.created_at
$$;
REVOKE ALL ON FUNCTION public.company_team(uuid) FROM anon;

CREATE OR REPLACE FUNCTION public.company_pending_admin_requests(_company uuid)
RETURNS TABLE(request_id uuid, user_id uuid, name text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.request_id, r.user_id, public.person_name(r.user_id), r.created_at
  FROM public.company_admin_requests r
  WHERE r.company_id = _company AND r.status = 'pending' AND public.is_company_admin(_company, auth.uid())
  ORDER BY r.created_at
$$;
REVOKE ALL ON FUNCTION public.company_pending_admin_requests(uuid) FROM anon;