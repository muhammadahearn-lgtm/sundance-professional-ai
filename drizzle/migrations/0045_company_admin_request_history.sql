CREATE OR REPLACE FUNCTION public.company_admin_request_history(_company uuid)
RETURNS TABLE(request_id uuid, user_id uuid, name text, status text, created_at timestamptz, resolved_at timestamptz, resolved_by_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.request_id, r.user_id, public.person_name(r.user_id), r.status, r.created_at, r.resolved_at,
    CASE WHEN r.resolved_by IS NULL THEN NULL ELSE public.person_name(r.resolved_by) END
  FROM public.company_admin_requests r
  WHERE r.company_id = _company
    AND (public.is_company_admin(_company, auth.uid()) OR r.user_id = auth.uid())
  ORDER BY (r.status = 'pending') DESC, coalesce(r.resolved_at, r.created_at) DESC
  LIMIT 200
$$;
REVOKE EXECUTE ON FUNCTION public.company_admin_request_history(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.company_admin_request_history(uuid) TO authenticated;