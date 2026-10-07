CREATE TABLE public.job_offers (
  offer_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES public.applications(application_id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(job_id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL,
  recruiter_id uuid NOT NULL,
  salary_amount integer CHECK (salary_amount IS NULL OR salary_amount BETWEEN 0 AND 100000000),
  salary_currency text NOT NULL DEFAULT 'USD',
  signing_bonus integer CHECK (signing_bonus IS NULL OR signing_bonus BETWEEN 0 AND 100000000),
  equity_details text NOT NULL DEFAULT '' CHECK (length(equity_details) <= 500),
  start_date date,
  expires_on date,
  notes text NOT NULL DEFAULT '' CHECK (length(notes) <= 3000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','withdrawn')),
  revision integer NOT NULL DEFAULT 1,
  decline_reason text NOT NULL DEFAULT '' CHECK (length(decline_reason) <= 1000),
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX job_offers_candidate_idx ON public.job_offers(candidate_id);
CREATE INDEX job_offers_job_idx ON public.job_offers(job_id);
CREATE UNIQUE INDEX job_offers_one_open ON public.job_offers(job_id, candidate_id) WHERE status = 'pending';

GRANT SELECT, INSERT, UPDATE ON public.job_offers TO authenticated;
GRANT ALL ON public.job_offers TO service_role;
ALTER TABLE public.job_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiter reads own offers" ON public.job_offers FOR SELECT TO authenticated USING (recruiter_id = auth.uid());
CREATE POLICY "Candidate reads own offers" ON public.job_offers FOR SELECT TO authenticated USING (candidate_id = auth.uid());
CREATE POLICY "Recruiter creates offers on own jobs" ON public.job_offers FOR INSERT TO authenticated
  WITH CHECK (recruiter_id = auth.uid() AND public.owns_job(job_id) AND status = 'pending');
CREATE POLICY "Recruiter updates own offers" ON public.job_offers FOR UPDATE TO authenticated
  USING (recruiter_id = auth.uid() AND public.owns_job(job_id)) WITH CHECK (recruiter_id = auth.uid() AND status IN ('pending','withdrawn'));

CREATE TRIGGER job_offers_updated BEFORE UPDATE ON public.job_offers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Recruiter edits bump the revision; decided offers are frozen for recruiters.
CREATE OR REPLACE FUNCTION public.job_offers_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IN ('accepted','declined','withdrawn') AND current_setting('app.offer_respond', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'This offer is already closed';
    END IF;
    IF current_setting('app.offer_respond', true) IS DISTINCT FROM 'on' AND NEW.status = 'pending'
       AND (NEW.salary_amount, NEW.signing_bonus, NEW.equity_details, NEW.start_date, NEW.expires_on, NEW.notes)
           IS DISTINCT FROM (OLD.salary_amount, OLD.signing_bonus, OLD.equity_details, OLD.start_date, OLD.expires_on, OLD.notes) THEN
      NEW.revision = OLD.revision + 1;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER job_offers_guard BEFORE UPDATE ON public.job_offers FOR EACH ROW EXECUTE FUNCTION public.job_offers_guard();

CREATE OR REPLACE FUNCTION public.notify_offer() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE jt text; url text;
BEGIN
  SELECT job_title INTO jt FROM public.jobs WHERE job_id = NEW.job_id;
  url := CASE WHEN NEW.application_id IS NULL THEN '/candidate/applications' ELSE '/candidate/applications/' || NEW.application_id END;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.create_notification(NEW.candidate_id, 'candidate', 'offer_received', 'application', 'You received a job offer',
      'You have an offer for ' || coalesce(jt, 'a role') || '. Review the details.', url, 'high', 'offer:' || NEW.offer_id || ':1');
  ELSIF NEW.status = 'pending' AND NEW.revision > OLD.revision THEN
    PERFORM public.create_notification(NEW.candidate_id, 'candidate', 'offer_revised', 'application', 'Your offer was updated',
      'The hiring team revised your offer for ' || coalesce(jt, 'a role') || '.', url, 'high', 'offer:' || NEW.offer_id || ':' || NEW.revision);
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('accepted','declined') THEN
    PERFORM public.create_notification(NEW.recruiter_id, 'recruiter', 'offer_' || NEW.status, 'pipeline',
      CASE WHEN NEW.status = 'accepted' THEN 'Offer accepted' ELSE 'Offer declined' END,
      coalesce(public.person_name(NEW.candidate_id), 'The candidate') || ' ' || NEW.status || ' your offer for ' || coalesce(jt, 'the role') || '.',
      '/recruiter/pipeline/' || NEW.job_id, 'high', 'offer:' || NEW.offer_id || ':' || NEW.status);
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.notify_offer() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.job_offers_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER job_offers_notify AFTER INSERT OR UPDATE ON public.job_offers FOR EACH ROW EXECUTE FUNCTION public.notify_offer();

-- Candidate decision: accept marks the application hired; decline keeps it at offer.
CREATE OR REPLACE FUNCTION public.respond_to_offer(_offer uuid, _accept boolean, _reason text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.job_offers;
BEGIN
  SELECT * INTO o FROM public.job_offers WHERE offer_id = _offer FOR UPDATE;
  IF o IS NULL OR o.candidate_id <> auth.uid() THEN RAISE EXCEPTION 'Offer not found'; END IF;
  IF o.status <> 'pending' THEN RAISE EXCEPTION 'This offer is no longer open'; END IF;
  IF o.expires_on IS NOT NULL AND o.expires_on < current_date THEN RAISE EXCEPTION 'This offer has expired'; END IF;
  PERFORM set_config('app.offer_respond', 'on', true);
  UPDATE public.job_offers SET status = CASE WHEN _accept THEN 'accepted' ELSE 'declined' END,
    decline_reason = CASE WHEN _accept THEN '' ELSE left(coalesce(_reason, ''), 1000) END, responded_at = now()
  WHERE offer_id = _offer;
  PERFORM set_config('app.offer_respond', 'off', true);
  IF _accept AND o.application_id IS NOT NULL THEN
    UPDATE public.applications SET application_status = 'hired' WHERE application_id = o.application_id;
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.respond_to_offer(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_offer(uuid, boolean, text) TO authenticated;