CREATE TABLE public.application_events (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(application_id) ON DELETE CASCADE,
  job_id uuid NOT NULL,
  kind text NOT NULL,
  detail text NOT NULL DEFAULT '',
  actor_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX application_events_app_idx ON public.application_events(application_id, occurred_at);
GRANT SELECT ON public.application_events TO authenticated;
GRANT ALL ON public.application_events TO service_role;
ALTER TABLE public.application_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Job owners read application history" ON public.application_events FOR SELECT TO authenticated USING (public.owns_job(job_id));

CREATE OR REPLACE FUNCTION public.log_application_event(_app uuid, _job uuid, _kind text, _detail text, _at timestamptz DEFAULT now())
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.application_events(application_id, job_id, kind, detail, actor_id, occurred_at)
  SELECT _app, _job, _kind, left(coalesce(_detail, ''), 300), auth.uid(), _at WHERE _app IS NOT NULL AND _job IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.trg_app_events_applications() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_application_event(NEW.application_id, NEW.job_id, 'applied', '', NEW.application_date);
  ELSE
    IF NEW.withdrawn_at IS NOT NULL AND OLD.withdrawn_at IS NULL THEN
      PERFORM public.log_application_event(NEW.application_id, NEW.job_id, 'withdrawn', coalesce(NEW.withdraw_reason, ''));
    ELSIF NEW.reneged_at IS NOT NULL AND OLD.reneged_at IS NULL THEN
      PERFORM public.log_application_event(NEW.application_id, NEW.job_id, 'reneged', coalesce(NEW.renege_reason, ''));
    ELSIF NEW.application_status IS DISTINCT FROM OLD.application_status THEN
      PERFORM public.log_application_event(NEW.application_id, NEW.job_id, 'status', NEW.application_status::text || CASE WHEN NEW.application_status = 'rejected' AND coalesce(NEW.disposition_reason, '') <> '' THEN ' · ' || NEW.disposition_reason ELSE '' END);
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER app_events_applications AFTER INSERT OR UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.trg_app_events_applications();

CREATE OR REPLACE FUNCTION public.trg_app_events_pipeline() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _app uuid;
BEGIN
  IF NEW.job_id IS NULL OR (TG_OP = 'UPDATE' AND NEW.current_stage IS NOT DISTINCT FROM OLD.current_stage) THEN RETURN NEW; END IF;
  SELECT application_id INTO _app FROM public.applications WHERE candidate_id = NEW.candidate_id AND job_id = NEW.job_id;
  PERFORM public.log_application_event(_app, NEW.job_id, 'stage', NEW.current_stage::text || CASE WHEN TG_OP = 'UPDATE' THEN ' from ' || OLD.current_stage::text ELSE '' END);
  RETURN NEW;
END $$;
CREATE TRIGGER app_events_pipeline AFTER INSERT OR UPDATE ON public.recruiting_pipeline FOR EACH ROW EXECUTE FUNCTION public.trg_app_events_pipeline();

CREATE OR REPLACE FUNCTION public.trg_app_events_interviews() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _app uuid := NEW.application_id;
BEGIN
  IF _app IS NULL THEN SELECT application_id INTO _app FROM public.applications WHERE candidate_id = NEW.candidate_id AND job_id = NEW.job_id; END IF;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_application_event(_app, NEW.job_id, 'interview_scheduled', 'Round ' || coalesce(NEW.round_number, 1) || ' · ' || to_char(NEW.scheduled_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'));
  ELSIF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    PERFORM public.log_application_event(_app, NEW.job_id, 'interview_cancelled', 'Round ' || coalesce(NEW.round_number, 1) || coalesce(' · ' || nullif(NEW.cancel_reason, ''), ''));
  ELSIF NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at THEN
    PERFORM public.log_application_event(_app, NEW.job_id, 'interview_rescheduled', 'Round ' || coalesce(NEW.round_number, 1) || ' · ' || to_char(NEW.scheduled_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'));
  ELSIF NEW.reschedule_requested_at IS NOT NULL AND OLD.reschedule_requested_at IS NULL THEN
    PERFORM public.log_application_event(_app, NEW.job_id, 'reschedule_requested', 'Round ' || coalesce(NEW.round_number, 1));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER app_events_interviews AFTER INSERT OR UPDATE ON public.interviews FOR EACH ROW EXECUTE FUNCTION public.trg_app_events_interviews();

CREATE OR REPLACE FUNCTION public.trg_app_events_offers() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_application_event(NEW.application_id, NEW.job_id, 'offer_sent', 'Revision ' || NEW.revision);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.log_application_event(NEW.application_id, NEW.job_id, 'offer_' || NEW.status, coalesce(NEW.decline_reason, ''));
  ELSIF NEW.revision IS DISTINCT FROM OLD.revision THEN
    PERFORM public.log_application_event(NEW.application_id, NEW.job_id, 'offer_revised', 'Revision ' || NEW.revision);
  ELSIF NEW.negotiated_at IS NOT NULL AND OLD.negotiated_at IS NULL THEN
    PERFORM public.log_application_event(NEW.application_id, NEW.job_id, 'offer_negotiation', '');
  ELSIF NEW.expires_on IS DISTINCT FROM OLD.expires_on THEN
    PERFORM public.log_application_event(NEW.application_id, NEW.job_id, 'offer_deadline', coalesce(NEW.expires_on::text, 'none'));
  ELSIF NEW.extension_status IS DISTINCT FROM OLD.extension_status AND NEW.extension_status IS NOT NULL THEN
    PERFORM public.log_application_event(NEW.application_id, NEW.job_id, 'offer_extension', NEW.extension_status);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER app_events_offers AFTER INSERT OR UPDATE ON public.job_offers FOR EACH ROW EXECUTE FUNCTION public.trg_app_events_offers();

REVOKE ALL ON FUNCTION public.log_application_event(uuid, uuid, text, text, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_app_events_applications() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_app_events_pipeline() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_app_events_interviews() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_app_events_offers() FROM PUBLIC, anon, authenticated;

-- Backfill what history already exists
INSERT INTO public.application_events(application_id, job_id, kind, detail, occurred_at)
SELECT application_id, job_id, 'applied', '', application_date FROM public.applications;
INSERT INTO public.application_events(application_id, job_id, kind, detail, occurred_at)
SELECT a.application_id, a.job_id, 'stage', p.current_stage::text, p.stage_date FROM public.recruiting_pipeline p JOIN public.applications a ON a.candidate_id = p.candidate_id AND a.job_id = p.job_id;
INSERT INTO public.application_events(application_id, job_id, kind, detail, occurred_at)
SELECT a.application_id, a.job_id, CASE WHEN i.status = 'cancelled' THEN 'interview_cancelled' ELSE 'interview_scheduled' END, 'Round ' || coalesce(i.round_number, 1) || ' · ' || to_char(i.scheduled_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), i.created_at
FROM public.interviews i JOIN public.applications a ON a.application_id = coalesce(i.application_id, (SELECT application_id FROM public.applications x WHERE x.candidate_id = i.candidate_id AND x.job_id = i.job_id));
INSERT INTO public.application_events(application_id, job_id, kind, detail, occurred_at)
SELECT application_id, job_id, 'offer_sent', 'Revision ' || revision, created_at FROM public.job_offers WHERE application_id IS NOT NULL;
INSERT INTO public.application_events(application_id, job_id, kind, detail, occurred_at)
SELECT application_id, job_id, 'offer_' || status, coalesce(decline_reason, ''), coalesce(responded_at, updated_at) FROM public.job_offers WHERE application_id IS NOT NULL AND status <> 'pending';
INSERT INTO public.application_events(application_id, job_id, kind, detail, occurred_at)
SELECT application_id, job_id, 'withdrawn', coalesce(withdraw_reason, ''), withdrawn_at FROM public.applications WHERE withdrawn_at IS NOT NULL;
INSERT INTO public.application_events(application_id, job_id, kind, detail, occurred_at)
SELECT application_id, job_id, 'reneged', coalesce(renege_reason, ''), reneged_at FROM public.applications WHERE reneged_at IS NOT NULL;