ALTER TABLE public.job_offers ADD COLUMN IF NOT EXISTS expiry_reminded_at timestamptz;

CREATE OR REPLACE FUNCTION public.job_offers_reset_reminder() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.expires_on IS DISTINCT FROM OLD.expires_on THEN NEW.expiry_reminded_at := NULL; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS job_offers_reset_reminder ON public.job_offers;
CREATE TRIGGER job_offers_reset_reminder BEFORE UPDATE ON public.job_offers FOR EACH ROW EXECUTE FUNCTION public.job_offers_reset_reminder();
REVOKE ALL ON FUNCTION public.job_offers_reset_reminder() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.deliver_offer_expiry_reminders()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE r record; n integer := 0;
BEGIN
  FOR r IN SELECT o.offer_id, o.candidate_id, o.recruiter_id, o.application_id, o.expires_on, jb.job_title
    FROM public.job_offers o JOIN public.jobs jb ON jb.job_id = o.job_id
    WHERE o.status = 'pending' AND o.expires_on IS NOT NULL AND o.expiry_reminded_at IS NULL
      AND o.expires_on >= current_date AND o.expires_on <= current_date + 1
    FOR UPDATE OF o SKIP LOCKED
  LOOP
    PERFORM public.create_notification(r.candidate_id, 'candidate', 'offer_expiring', 'offer', 'Your offer expires soon',
      'Your offer for ' || r.job_title || ' expires ' || CASE WHEN r.expires_on = current_date THEN 'today' ELSE 'tomorrow' END || '. Review the terms, accept, or request more time.',
      COALESCE('/candidate/applications/' || r.application_id, '/candidate/applications'), 'high',
      'offer:' || r.offer_id || ':expiring:' || r.expires_on);
    PERFORM public.create_notification(r.recruiter_id, 'recruiter', 'offer_expiring', 'offer', 'Offer deadline approaching',
      'The ' || r.job_title || ' offer expires ' || CASE WHEN r.expires_on = current_date THEN 'today' ELSE 'tomorrow' END || ' with no response yet. Consider a quick nudge.',
      '/recruiter/pipeline', 'medium', 'offer:' || r.offer_id || ':expiring-rec:' || r.expires_on);
    UPDATE public.job_offers SET expiry_reminded_at = now() WHERE offer_id = r.offer_id;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.deliver_offer_expiry_reminders() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('deliver-due-rejections', '0 * * * *', 'SELECT public.deliver_due_rejections(); SELECT public.deliver_offer_expiry_reminders();');