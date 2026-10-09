CREATE TABLE public.team_review_links (
  token_hash text PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.jobs(job_id) ON DELETE CASCADE,
  stakeholder_id uuid NOT NULL REFERENCES public.job_stakeholders(stakeholder_id) ON DELETE CASCADE,
  candidate_ids uuid[] NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.team_review_links TO service_role;
ALTER TABLE public.team_review_links ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_recommendations (
  recommendation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(job_id) ON DELETE CASCADE,
  stakeholder_id uuid NOT NULL REFERENCES public.job_stakeholders(stakeholder_id) ON DELETE CASCADE,
  candidate_id uuid,
  kind text NOT NULL CHECK (kind IN ('recommend','pass_all')),
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, stakeholder_id),
  CHECK ((kind = 'recommend') = (candidate_id IS NOT NULL))
);
GRANT SELECT ON public.team_recommendations TO authenticated;
GRANT ALL ON public.team_recommendations TO service_role;
ALTER TABLE public.team_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recruiters read own job recommendations" ON public.team_recommendations
  FOR SELECT TO authenticated USING (public.owns_job(job_id));

CREATE OR REPLACE FUNCTION public.notify_team_recommendation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r uuid; t text; s record; cn text;
BEGIN
  SELECT recruiter_id, job_title INTO r, t FROM jobs WHERE job_id = NEW.job_id;
  SELECT name, hiring_role INTO s FROM job_stakeholders WHERE stakeholder_id = NEW.stakeholder_id;
  IF NEW.kind = 'recommend' THEN
    SELECT trim(first_name || ' ' || left(last_name,1) || '.') INTO cn FROM profiles WHERE user_id = NEW.candidate_id;
    PERFORM create_notification(r, 'recruiter', 'team_recommendation', 'pipeline',
      s.name || ' recommended ' || coalesce(cn,'a candidate'),
      s.name || coalesce(' (' || nullif(s.hiring_role,'') || ')','') || ' recommended ' || coalesce(cn,'a candidate') || ' for ' || t || '.' || CASE WHEN NEW.note <> '' THEN ' Note: ' || NEW.note ELSE '' END,
      '/recruiter/pipeline/' || NEW.job_id, 'high', 'team-rec-' || NEW.recommendation_id || '-' || extract(epoch from NEW.updated_at));
  ELSE
    PERFORM create_notification(r, 'recruiter', 'team_recommendation', 'pipeline',
      s.name || ' asked for more candidates',
      s.name || ' felt none of the shared candidates fit ' || t || '.' || CASE WHEN NEW.note <> '' THEN ' Note: ' || NEW.note ELSE '' END,
      '/recruiter/pipeline/' || NEW.job_id, 'high', 'team-rec-' || NEW.recommendation_id || '-' || extract(epoch from NEW.updated_at));
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_team_recommendation() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER team_recommendation_notify AFTER INSERT OR UPDATE ON public.team_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.notify_team_recommendation();