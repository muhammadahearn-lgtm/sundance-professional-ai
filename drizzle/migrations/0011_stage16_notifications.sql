CREATE TYPE public.notification_priority AS ENUM ('high','medium','low');
CREATE TYPE public.notification_status AS ENUM ('unread','read','archived');

CREATE TABLE public.notifications (
  notification_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_type public.app_role NOT NULL,
  notification_type text NOT NULL,
  category text NOT NULL CHECK (category IN ('application','messaging','pipeline','recommendation','career','match')),
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  action_url text NOT NULL DEFAULT '',
  priority public.notification_priority NOT NULL DEFAULT 'medium',
  status public.notification_status NOT NULL DEFAULT 'unread',
  group_count integer NOT NULL DEFAULT 1,
  dedupe_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE UNIQUE INDEX notifications_dedupe ON public.notifications (recipient_id, dedupe_key);
CREATE INDEX notifications_recipient_created ON public.notifications (recipient_id, created_at DESC);
GRANT SELECT, DELETE ON public.notifications TO authenticated;
GRANT UPDATE (status, read_at) ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recipients read own notifications" ON public.notifications FOR SELECT TO authenticated USING (recipient_id = auth.uid());
CREATE POLICY "Recipients update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());
CREATE POLICY "Recipients delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (recipient_id = auth.uid());
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  application boolean NOT NULL DEFAULT true,
  messaging boolean NOT NULL DEFAULT true,
  pipeline boolean NOT NULL DEFAULT true,
  recommendation boolean NOT NULL DEFAULT true,
  career boolean NOT NULL DEFAULT true,
  match boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own prefs" ON public.notification_preferences FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own prefs" ON public.notification_preferences FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own prefs" ON public.notification_preferences FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.create_notification(_recipient uuid, _rtype public.app_role, _type text, _category text, _title text, _message text, _url text, _priority public.notification_priority, _dedupe text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.notification_preferences; has_prefs boolean; allowed boolean;
BEGIN
  IF _recipient IS NULL THEN RETURN; END IF;
  SELECT * INTO p FROM public.notification_preferences WHERE user_id = _recipient;
  has_prefs := FOUND;
  allowed := CASE _category WHEN 'application' THEN p.application WHEN 'messaging' THEN p.messaging WHEN 'pipeline' THEN p.pipeline
     WHEN 'recommendation' THEN p.recommendation WHEN 'career' THEN p.career WHEN 'match' THEN p.match ELSE true END;
  IF has_prefs AND allowed IS FALSE THEN RETURN; END IF;
  INSERT INTO public.notifications (recipient_id, recipient_type, notification_type, category, title, message, action_url, priority, dedupe_key)
  VALUES (_recipient, _rtype, _type, _category, left(_title, 200), left(coalesce(_message,''), 500), coalesce(_url,''), _priority, _dedupe)
  ON CONFLICT (recipient_id, dedupe_key) DO NOTHING;
END $$;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, public.app_role, text, text, text, text, text, public.notification_priority, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.person_name(_uid uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(nullif(trim(first_name || ' ' || last_name), ''), 'Someone') FROM public.profiles WHERE user_id = _uid
$$;
REVOKE EXECUTE ON FUNCTION public.person_name(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_application() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j record; cname text; t text; ttl text; msg text; pr public.notification_priority;
BEGIN
  SELECT jb.job_title, jb.recruiter_id, coalesce(c.company_name, '') AS company INTO j
  FROM public.jobs jb LEFT JOIN public.companies c ON c.company_id = jb.company_id WHERE jb.job_id = NEW.job_id;
  cname := coalesce(public.person_name(NEW.candidate_id), 'A candidate');
  IF TG_OP = 'INSERT' THEN
    PERFORM public.create_notification(NEW.candidate_id, 'candidate', 'application_submitted', 'application', 'Application submitted',
      'Your application for ' || j.job_title || CASE WHEN j.company <> '' THEN ' at ' || j.company ELSE '' END || ' was sent. Track its progress in Applications.',
      '/candidate/applications/' || NEW.application_id, 'low', 'app:' || NEW.application_id || ':applied');
    PERFORM public.create_notification(j.recruiter_id, 'recruiter', 'new_application', 'application', 'New application',
      cname || ' applied to ' || j.job_title || '. Review their profile and match score.',
      '/recruiter/applications/' || NEW.application_id, 'high', 'app:' || NEW.application_id || ':new');
  ELSIF NEW.application_status IS DISTINCT FROM OLD.application_status THEN
    t := NEW.application_status::text;
    SELECT x.a, x.b, x.c INTO ttl, msg, pr FROM (VALUES
      ('viewed', 'Application viewed', 'A recruiter viewed your application for ' || j.job_title || '.', 'low'::public.notification_priority),
      ('recruiter_contacted', 'Recruiter contacted you', 'A recruiter reached out about ' || j.job_title || '. Check your messages.', 'medium'),
      ('interviewing', 'Moved to interviewing', 'You moved to the interview stage for ' || j.job_title || '. Prepare and watch your messages.', 'high'),
      ('offer', 'Offer received', 'You received an offer for ' || j.job_title || '. Review the details with the recruiter.', 'high'),
      ('hired', 'You''re hired', 'Congratulations — you were hired for ' || j.job_title || '.', 'high'),
      ('rejected', 'Application update', 'The ' || j.job_title || ' role moved forward with other candidates. Explore more matching jobs.', 'medium')
    ) AS x(s, a, b, c) WHERE x.s = t;
    IF ttl IS NOT NULL THEN
      PERFORM public.create_notification(NEW.candidate_id, 'candidate', 'application_' || t, 'application', ttl, msg,
        '/candidate/applications/' || NEW.application_id, pr, 'app:' || NEW.application_id || ':' || t);
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER notify_application AFTER INSERT OR UPDATE OF application_status ON public.applications FOR EACH ROW EXECUTE FUNCTION public.notify_application();

CREATE OR REPLACE FUNCTION public.notify_pipeline() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.current_stage IS NOT DISTINCT FROM OLD.current_stage THEN RETURN NEW; END IF;
  PERFORM public.create_notification(NEW.recruiter_id, 'recruiter', 'pipeline_stage_change', 'pipeline', 'Pipeline updated',
    coalesce(public.person_name(NEW.candidate_id), 'A candidate') || ' is now in ' || initcap(NEW.current_stage::text) || '.',
    CASE WHEN NEW.job_id IS NULL THEN '/recruiter/pipeline' ELSE '/recruiter/pipeline/' || NEW.job_id END, 'low',
    'pipe:' || NEW.pipeline_id || ':' || NEW.current_stage);
  RETURN NEW;
END $$;
CREATE TRIGGER notify_pipeline AFTER INSERT OR UPDATE OF current_stage ON public.recruiting_pipeline FOR EACH ROW EXECUTE FUNCTION public.notify_pipeline();

CREATE OR REPLACE FUNCTION public.notify_message() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; rcpt uuid; rtype public.app_role; sname text; url text; is_first boolean; existing uuid; pref boolean; ntype text; ttl text;
BEGIN
  SELECT * INTO c FROM public.conversations WHERE conversation_id = NEW.conversation_id;
  IF NEW.sender_id = c.candidate_id THEN rcpt := c.recruiter_id; rtype := 'recruiter'; ELSE rcpt := c.candidate_id; rtype := 'candidate'; END IF;
  SELECT messaging INTO pref FROM public.notification_preferences WHERE user_id = rcpt;
  IF pref IS FALSE THEN RETURN NEW; END IF;
  sname := coalesce(public.person_name(NEW.sender_id), 'Someone');
  url := '/' || rtype || '/messages/' || NEW.conversation_id;
  SELECT notification_id INTO existing FROM public.notifications
    WHERE recipient_id = rcpt AND status = 'unread' AND category = 'messaging' AND action_url = url LIMIT 1;
  IF existing IS NOT NULL THEN
    UPDATE public.notifications SET group_count = group_count + 1, created_at = now(),
      title = (group_count + 1) || ' new messages from ' || sname,
      message = left(coalesce(nullif(NEW.message_body, ''), 'Sent an attachment'), 200)
    WHERE notification_id = existing;
    RETURN NEW;
  END IF;
  is_first := NOT EXISTS (SELECT 1 FROM public.messages WHERE conversation_id = NEW.conversation_id AND message_id <> NEW.message_id);
  IF is_first THEN ntype := 'new_conversation'; ttl := sname || ' started a conversation';
  ELSIF NEW.attachment_path IS NOT NULL THEN ntype := 'attachment_received'; ttl := sname || ' sent an attachment';
  ELSIF rtype = 'recruiter' THEN ntype := 'candidate_replied'; ttl := sname || ' replied';
  ELSE ntype := 'new_message'; ttl := 'New message from ' || sname; END IF;
  INSERT INTO public.notifications (recipient_id, recipient_type, notification_type, category, title, message, action_url, priority)
  VALUES (rcpt, rtype, ntype, 'messaging', ttl, left(coalesce(nullif(NEW.message_body, ''), coalesce(NEW.attachment_name, 'Attachment')), 200), url, 'high');
  RETURN NEW;
END $$;
CREATE TRIGGER notify_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.notify_message();

CREATE OR REPLACE FUNCTION public.notify_match() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j record; old_s numeric; new_s numeric := NEW.overall_match_score; visible boolean;
BEGIN
  SELECT job_title, recruiter_id, job_status INTO j FROM public.jobs WHERE job_id = NEW.job_id;
  IF j.job_status IS DISTINCT FROM 'active' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN old_s := OLD.overall_match_score; END IF;
  IF new_s >= 85 AND (old_s IS NULL OR old_s < 85) THEN
    PERFORM public.create_notification(NEW.candidate_id, 'candidate', 'high_match_job', 'recommendation', 'New high match job',
      j.job_title || ' matches your profile at ' || round(new_s) || '%. Take a look before it fills.',
      '/candidate/jobs/' || NEW.job_id, 'high', 'hmj:' || NEW.job_id);
    visible := EXISTS (SELECT 1 FROM public.candidate_profiles WHERE user_id = NEW.candidate_id AND visibility_status IN ('public','recruiter_searchable'))
      OR EXISTS (SELECT 1 FROM public.applications WHERE candidate_id = NEW.candidate_id AND job_id = NEW.job_id);
    IF visible THEN
      PERFORM public.create_notification(j.recruiter_id, 'recruiter', 'high_match_candidate', 'recommendation', 'New high match candidate',
        coalesce(public.person_name(NEW.candidate_id), 'A candidate') || ' matches ' || j.job_title || ' at ' || round(new_s) || '%.',
        '/recruiter/candidates/' || NEW.candidate_id, 'high', 'hmc:' || NEW.candidate_id || ':' || NEW.job_id);
    END IF;
  ELSIF old_s IS NOT NULL AND new_s >= old_s + 5 THEN
    PERFORM public.create_notification(NEW.candidate_id, 'candidate', 'match_score_increased', 'match', 'Match score increased',
      'Your match for ' || j.job_title || ' rose from ' || round(old_s) || '% to ' || round(new_s) || '%.',
      '/candidate/jobs/' || NEW.job_id, 'medium', 'mi:' || NEW.job_id || ':' || (floor(new_s / 5) * 5)::int);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER notify_match AFTER INSERT OR UPDATE OF overall_match_score ON public.match_scores FOR EACH ROW EXECUTE FUNCTION public.notify_match();

CREATE OR REPLACE FUNCTION public.notify_career() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prev numeric; m int;
BEGIN
  SELECT readiness_score INTO prev FROM public.career_snapshots WHERE candidate_id = NEW.candidate_id AND snapshot_date < NEW.snapshot_date ORDER BY snapshot_date DESC LIMIT 1;
  IF prev IS NOT NULL AND NEW.readiness_score >= prev + 5 THEN
    PERFORM public.create_notification(NEW.candidate_id, 'candidate', 'career_readiness_improved', 'career', 'Career readiness improved',
      'Your readiness rose from ' || round(prev) || ' to ' || round(NEW.readiness_score) || '. See what to work on next.',
      '/candidate/career', 'medium', 'cr:' || NEW.snapshot_date);
  END IF;
  FOREACH m IN ARRAY ARRAY[50, 75, 90] LOOP
    IF NEW.readiness_score >= m AND coalesce(prev, 0) < m THEN
      PERFORM public.create_notification(NEW.candidate_id, 'candidate', 'career_milestone', 'career', 'Career milestone reached',
        'Your career readiness passed ' || m || '. Keep building on it.', '/candidate/career', 'low', 'ms:' || m);
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER notify_career AFTER INSERT OR UPDATE OF readiness_score ON public.career_snapshots FOR EACH ROW EXECUTE FUNCTION public.notify_career();

CREATE OR REPLACE FUNCTION public.notify_availability() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r uuid; nm text;
BEGIN
  IF NEW.availability IS NOT DISTINCT FROM OLD.availability OR NEW.visibility_status = 'private' THEN RETURN NEW; END IF;
  nm := coalesce(public.person_name(NEW.user_id), 'A candidate');
  FOR r IN SELECT recruiter_id FROM public.recruiting_pipeline WHERE candidate_id = NEW.user_id
           UNION SELECT recruiter_id FROM public.saved_candidates WHERE candidate_id = NEW.user_id LOOP
    PERFORM public.create_notification(r, 'recruiter', 'availability_changed', 'pipeline', 'Candidate availability changed',
      nm || ' is now: ' || replace(NEW.availability, '_', ' ') || '.', '/recruiter/candidates/' || NEW.user_id, 'medium',
      'av:' || NEW.user_id || ':' || md5(NEW.availability));
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER notify_availability AFTER UPDATE OF availability ON public.candidate_profiles FOR EACH ROW EXECUTE FUNCTION public.notify_availability();

CREATE OR REPLACE FUNCTION public.notify_saved_job() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c uuid; what text;
BEGIN
  IF OLD.job_status = 'active' AND NEW.job_status IN ('closed','paused') THEN what := 'is no longer accepting applications';
  ELSIF NEW.job_status = 'active' AND (NEW.minimum_salary IS DISTINCT FROM OLD.minimum_salary OR NEW.maximum_salary IS DISTINCT FROM OLD.maximum_salary
        OR NEW.job_title IS DISTINCT FROM OLD.job_title OR NEW.work_arrangement IS DISTINCT FROM OLD.work_arrangement OR NEW.location IS DISTINCT FROM OLD.location) THEN
    what := 'was updated';
  ELSE RETURN NEW; END IF;
  FOR c IN SELECT candidate_id FROM public.saved_jobs WHERE job_id = NEW.job_id LOOP
    PERFORM public.create_notification(c, 'candidate', 'saved_job_updated', 'application', 'Saved job updated',
      NEW.job_title || ' ' || what || '.', '/candidate/jobs/' || NEW.job_id, 'low',
      'sj:' || NEW.job_id || ':' || to_char(now(), 'YYYYMMDDHH24'));
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER notify_saved_job AFTER UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.notify_saved_job();

REVOKE EXECUTE ON FUNCTION public.notify_application(), public.notify_pipeline(), public.notify_message(), public.notify_match(), public.notify_career(), public.notify_availability(), public.notify_saved_job() FROM PUBLIC, anon, authenticated;