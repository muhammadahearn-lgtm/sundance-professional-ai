CREATE TABLE public.moderators (
  user_id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.moderators TO authenticated;
GRANT ALL ON public.moderators TO service_role;
ALTER TABLE public.moderators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own moderator row" ON public.moderators FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_moderator(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.moderators WHERE user_id = _uid)
$$;
REVOKE EXECUTE ON FUNCTION public.is_moderator(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_moderator(uuid) TO authenticated;

CREATE TABLE public.reports (
  report_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL DEFAULT auth.uid(),
  target_type text NOT NULL CHECK (target_type IN ('job','company','message','user')),
  target_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('spam','scam','inappropriate','harassment','misleading','other')),
  details text NOT NULL DEFAULT '' CHECK (char_length(details) <= 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  resolution_note text NOT NULL DEFAULT '' CHECK (char_length(resolution_note) <= 1000),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reporter_id, target_type, target_id)
);
CREATE INDEX reports_status_idx ON public.reports(status, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Report own" ON public.reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid() AND status = 'open' AND reviewed_by IS NULL AND resolution_note = '');
CREATE POLICY "Read own or moderator" ON public.reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.is_moderator(auth.uid()));
CREATE POLICY "Moderators update" ON public.reports FOR UPDATE TO authenticated
  USING (public.is_moderator(auth.uid())) WITH CHECK (public.is_moderator(auth.uid()));

CREATE OR REPLACE FUNCTION public.moderate_restrict(_type text, _target uuid, _restrict boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_moderator(auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _type = 'user' THEN
    UPDATE public.profiles SET status = CASE WHEN _restrict THEN 'suspended'::user_status ELSE 'active'::user_status END WHERE user_id = _target;
  ELSIF _type = 'job' THEN
    UPDATE public.jobs SET job_status = CASE WHEN _restrict THEN 'paused'::job_status ELSE 'active'::job_status END
      WHERE job_id = _target AND job_status IN ('active','paused');
  ELSE RAISE EXCEPTION 'Only users and jobs can be restricted';
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.moderate_restrict(text, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_restrict(text, uuid, boolean) TO authenticated;