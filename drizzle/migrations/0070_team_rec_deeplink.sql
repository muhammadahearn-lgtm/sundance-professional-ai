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
      '/recruiter/pipeline/' || NEW.job_id || '?candidate=' || NEW.candidate_id, 'high', 'team-rec-' || NEW.recommendation_id || '-' || extract(epoch from NEW.updated_at));
  ELSE
    PERFORM create_notification(r, 'recruiter', 'team_recommendation', 'pipeline',
      s.name || ' asked for more candidates',
      s.name || ' felt none of the shared candidates fit ' || t || '.' || CASE WHEN NEW.note <> '' THEN ' Note: ' || NEW.note ELSE '' END,
      '/recruiter/pipeline/' || NEW.job_id, 'high', 'team-rec-' || NEW.recommendation_id || '-' || extract(epoch from NEW.updated_at));
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_team_recommendation() FROM PUBLIC, anon, authenticated;