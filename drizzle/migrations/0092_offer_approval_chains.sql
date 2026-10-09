ALTER TABLE public.job_offers
  ADD COLUMN IF NOT EXISTS approver_id uuid,
  ADD COLUMN IF NOT EXISTS approval_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_note text NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS job_offers_one_open_v2 ON public.job_offers (job_id, candidate_id)
  WHERE status IN ('pending','pending_approval','approval_declined');
DROP INDEX IF EXISTS public.job_offers_one_open;
CREATE INDEX IF NOT EXISTS job_offers_approver_idx ON public.job_offers (approver_id) WHERE approver_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.can_approve_offer_for(_job uuid, _approver uuid, _recruiter uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _approver IS NOT NULL AND _approver <> _recruiter AND public.has_role(_approver, 'recruiter') AND EXISTS (
    SELECT 1 FROM public.company_members m
    WHERE m.user_id = _approver AND (
      m.company_id = (SELECT company_id FROM public.jobs WHERE job_id = _job)
      OR m.company_id IN (SELECT company_id FROM public.company_members WHERE user_id = _recruiter)))
$$;
REVOKE ALL ON FUNCTION public.can_approve_offer_for(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_approve_offer_for(uuid, uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.offer_approver_options(_job uuid)
RETURNS TABLE(user_id uuid, name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT m.user_id, public.person_name(m.user_id)
  FROM public.company_members m
  WHERE public.owns_job(_job)
    AND public.can_approve_offer_for(_job, m.user_id, auth.uid())
  ORDER BY 2
$$;
REVOKE ALL ON FUNCTION public.offer_approver_options(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.offer_approver_options(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.job_offers_approval_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE approving boolean := current_setting('app.offer_approve', true) = 'on';
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('pending','pending_approval') THEN RAISE EXCEPTION 'Invalid offer status'; END IF;
    IF NEW.status = 'pending_approval' THEN
      IF NOT public.can_approve_offer_for(NEW.job_id, NEW.approver_id, NEW.recruiter_id) THEN RAISE EXCEPTION 'Pick a teammate to approve this offer'; END IF;
      NEW.approval_requested_at := now();
    ELSE
      NEW.approver_id := NULL;
    END IF;
    NEW.approved_at := NULL; NEW.approval_note := '';
    RETURN NEW;
  END IF;
  IF NOT approving THEN
    IF OLD.status IN ('pending_approval','approval_declined') AND NEW.status = 'pending' THEN
      RAISE EXCEPTION 'This offer needs internal approval before it can be sent';
    END IF;
    IF NEW.status = 'approval_declined' AND OLD.status <> 'approval_declined' THEN RAISE EXCEPTION 'Only the approver can send an offer back'; END IF;
    IF NEW.status = 'pending_approval' AND OLD.status NOT IN ('pending_approval','approval_declined') THEN
      RAISE EXCEPTION 'A sent offer cannot go back to approval';
    END IF;
    IF NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN RAISE EXCEPTION 'Approval fields are read-only'; END IF;
    IF NEW.status = 'pending_approval' THEN
      IF NOT public.can_approve_offer_for(NEW.job_id, NEW.approver_id, NEW.recruiter_id) THEN RAISE EXCEPTION 'Pick a teammate to approve this offer'; END IF;
      IF OLD.status = 'approval_declined' THEN NEW.approval_requested_at := now(); NEW.approval_note := ''; END IF;
    ELSIF NEW.approver_id IS DISTINCT FROM OLD.approver_id OR NEW.approval_note IS DISTINCT FROM OLD.approval_note THEN
      RAISE EXCEPTION 'Approval fields are read-only';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS job_offers_approval_guard ON public.job_offers;
CREATE TRIGGER job_offers_approval_guard BEFORE INSERT OR UPDATE ON public.job_offers
  FOR EACH ROW EXECUTE FUNCTION public.job_offers_approval_guard();

CREATE OR REPLACE FUNCTION public.review_offer_approval(_offer uuid, _approve boolean, _note text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.job_offers;
BEGIN
  SELECT * INTO o FROM public.job_offers WHERE offer_id = _offer FOR UPDATE;
  IF o.offer_id IS NULL OR o.approver_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Not your approval'; END IF;
  IF o.status <> 'pending_approval' THEN RAISE EXCEPTION 'This offer is no longer waiting for approval'; END IF;
  IF NOT _approve AND length(btrim(coalesce(_note,''))) < 3 THEN RAISE EXCEPTION 'Add a short note so the recruiter knows what to change'; END IF;
  PERFORM set_config('app.offer_approve', 'on', true);
  UPDATE public.job_offers SET
    status = CASE WHEN _approve THEN 'pending' ELSE 'approval_declined' END,
    approved_at = CASE WHEN _approve THEN now() ELSE NULL END,
    approval_note = left(btrim(coalesce(_note,'')), 1000),
    updated_at = now()
  WHERE offer_id = _offer;
  PERFORM set_config('app.offer_approve', 'off', true);
END $$;
REVOKE ALL ON FUNCTION public.review_offer_approval(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_offer_approval(uuid, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.my_offer_approvals()
RETURNS TABLE(offer_id uuid, job_id uuid, job_title text, candidate_name text, recruiter_name text, salary_amount integer, salary_currency text,
  signing_bonus integer, equity_details text, start_date date, expires_on date, notes text, status text, approval_note text,
  approval_requested_at timestamptz, approved_at timestamptz, max_salary integer, min_salary integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.offer_id, o.job_id, j.job_title, public.person_name(o.candidate_id), public.person_name(o.recruiter_id), o.salary_amount, o.salary_currency,
    o.signing_bonus, o.equity_details, o.start_date, o.expires_on, o.notes, o.status, o.approval_note, o.approval_requested_at, o.approved_at,
    j.maximum_salary::integer, j.minimum_salary::integer
  FROM public.job_offers o JOIN public.jobs j ON j.job_id = o.job_id
  WHERE o.approver_id = auth.uid()
  ORDER BY (o.status = 'pending_approval') DESC, o.approval_requested_at DESC NULLS LAST
  LIMIT 200
$$;
REVOKE ALL ON FUNCTION public.my_offer_approvals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_offer_approvals() TO authenticated;

DROP POLICY IF EXISTS "Candidate reads own offers" ON public.job_offers;
CREATE POLICY "Candidate reads own offers" ON public.job_offers FOR SELECT TO authenticated
  USING (candidate_id = auth.uid() AND status NOT IN ('pending_approval','approval_declined'));
DROP POLICY IF EXISTS "Recruiter creates offers on own jobs" ON public.job_offers;
CREATE POLICY "Recruiter creates offers on own jobs" ON public.job_offers FOR INSERT TO authenticated
  WITH CHECK (recruiter_id = auth.uid() AND public.owns_job(job_id) AND status IN ('pending','pending_approval'));
DROP POLICY IF EXISTS "Recruiter updates own offers" ON public.job_offers;
CREATE POLICY "Recruiter updates own offers" ON public.job_offers FOR UPDATE TO authenticated
  USING (recruiter_id = auth.uid() AND public.owns_job(job_id))
  WITH CHECK (recruiter_id = auth.uid() AND status IN ('pending','withdrawn','pending_approval','approval_declined'));

CREATE OR REPLACE FUNCTION public.notify_offer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE jt text; url text; cn text;
BEGIN
  SELECT job_title INTO jt FROM public.jobs WHERE job_id = NEW.job_id;
  cn := coalesce(public.person_name(NEW.candidate_id), 'a candidate');
  url := CASE WHEN NEW.application_id IS NULL THEN '/candidate/applications' ELSE '/candidate/applications/' || NEW.application_id END;
  IF NEW.status = 'pending_approval' AND (TG_OP = 'INSERT' OR OLD.status <> 'pending_approval') THEN
    PERFORM public.create_notification(NEW.approver_id, 'recruiter', 'offer_approval_requested', 'pipeline', 'Offer needs your approval',
      coalesce(public.person_name(NEW.recruiter_id), 'A teammate') || ' asks you to approve an offer to ' || cn || ' for ' || coalesce(jt, 'a role') || '.',
      '/recruiter/approvals', 'high', 'offer:' || NEW.offer_id || ':approval:' || extract(epoch from coalesce(NEW.approval_requested_at, now()))::bigint);
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM public.create_notification(NEW.candidate_id, 'candidate', 'offer_received', 'application', 'You received a job offer',
      'You have an offer for ' || coalesce(jt, 'a role') || '. Review the details.', url, 'high', 'offer:' || NEW.offer_id || ':1');
  ELSIF NEW.status = 'pending' AND OLD.status = 'pending_approval' THEN
    PERFORM public.create_notification(NEW.candidate_id, 'candidate', 'offer_received', 'application', 'You received a job offer',
      'You have an offer for ' || coalesce(jt, 'a role') || '. Review the details.', url, 'high', 'offer:' || NEW.offer_id || ':1');
    PERFORM public.create_notification(NEW.recruiter_id, 'recruiter', 'offer_approved', 'pipeline', 'Offer approved and sent',
      'Your offer to ' || cn || ' for ' || coalesce(jt, 'the role') || ' was approved and sent to the candidate.',
      '/recruiter/pipeline/' || NEW.job_id, 'high', 'offer:' || NEW.offer_id || ':approved');
  ELSIF NEW.status = 'approval_declined' AND OLD.status = 'pending_approval' THEN
    PERFORM public.create_notification(NEW.recruiter_id, 'recruiter', 'offer_approval_declined', 'pipeline', 'Offer sent back for changes',
      'Your offer to ' || cn || ' for ' || coalesce(jt, 'the role') || ' needs changes: ' || left(NEW.approval_note, 200),
      '/recruiter/pipeline/' || NEW.job_id, 'high', 'offer:' || NEW.offer_id || ':declined:' || extract(epoch from now())::bigint);
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
END $function$;