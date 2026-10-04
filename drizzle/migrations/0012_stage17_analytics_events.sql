CREATE TABLE public.analytics_events (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  event_type text NOT NULL CHECK (event_type IN ('job_view','recommendation_view','recommendation_click','candidate_view')),
  entity_id uuid NOT NULL,
  event_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX analytics_events_daily ON public.analytics_events (user_id, event_type, entity_id, event_date);
CREATE INDEX analytics_events_entity ON public.analytics_events (event_type, entity_id);
GRANT SELECT, INSERT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users log own events" ON public.analytics_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users read own events" ON public.analytics_events FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Recruiters get aggregate view counts for their own jobs only (no viewer identities).
CREATE OR REPLACE FUNCTION public.my_job_view_counts()
RETURNS TABLE(job_id uuid, views bigint, viewers bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.entity_id, count(*), count(DISTINCT e.user_id)
  FROM public.analytics_events e JOIN public.jobs j ON j.job_id = e.entity_id
  WHERE e.event_type = 'job_view' AND j.recruiter_id = auth.uid()
  GROUP BY e.entity_id
$$;
REVOKE EXECUTE ON FUNCTION public.my_job_view_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_job_view_counts() TO authenticated;