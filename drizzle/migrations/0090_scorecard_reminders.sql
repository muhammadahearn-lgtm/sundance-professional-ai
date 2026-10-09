ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS scorecard_reminded_at timestamptz;

CREATE OR REPLACE FUNCTION public.interviews_reset_scorecard_reminder() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at OR NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes THEN
    NEW.scorecard_reminded_at := NULL;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS interviews_reset_scorecard_reminder ON public.interviews;
CREATE TRIGGER interviews_reset_scorecard_reminder BEFORE UPDATE ON public.interviews FOR EACH ROW EXECUTE FUNCTION public.interviews_reset_scorecard_reminder();

CREATE OR REPLACE FUNCTION public.deliver_scorecard_reminders() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n integer := 0;
BEGIN
  FOR r IN SELECT i.interview_id, i.recruiter_id, i.candidate_id, COALESCE(i.round_number, 1) AS rnd, jb.job_title
    FROM public.interviews i LEFT JOIN public.jobs jb ON jb.job_id = i.job_id
    WHERE i.status NOT IN ('cancelled', 'canceled') AND i.scorecard_reminded_at IS NULL
      AND i.scheduled_at + make_interval(mins => i.duration_minutes) <= now()
      AND i.scheduled_at > now() - interval '14 days'
      AND NOT EXISTS (SELECT 1 FROM public.interview_scorecards s WHERE s.interview_id = i.interview_id)
    ORDER BY i.scheduled_at LIMIT 500
    FOR UPDATE OF i SKIP LOCKED
  LOOP
    PERFORM public.create_notification(r.recruiter_id, 'recruiter', 'scorecard_due', 'interview', 'Scorecard needed',
      'Your interview with ' || COALESCE(public.person_name(r.candidate_id), 'a candidate') || COALESCE(' for ' || r.job_title, '') || ' has ended — submit your Round ' || r.rnd || ' scorecard to keep the pipeline moving.',
      '/recruiter/interviews?score=' || r.interview_id, 'high', 'interview:' || r.interview_id || ':scorecard');
    UPDATE public.interviews SET scorecard_reminded_at = now() WHERE interview_id = r.interview_id;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.deliver_scorecard_reminders() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.interviews_reset_scorecard_reminder() FROM PUBLIC, anon, authenticated;