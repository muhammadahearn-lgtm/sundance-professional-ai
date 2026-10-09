ALTER TABLE public.job_offers
  ADD COLUMN extension_requested_until date,
  ADD COLUMN extension_note text NOT NULL DEFAULT '' CHECK (length(extension_note) <= 500),
  ADD COLUMN extension_status text NOT NULL DEFAULT '' CHECK (extension_status IN ('','requested','granted','declined')),
  ADD COLUMN extension_responded_at timestamptz;

CREATE OR REPLACE FUNCTION public.request_offer_extension(_offer uuid, _until date, _note text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.job_offers; jt text;
BEGIN
  SELECT * INTO o FROM public.job_offers WHERE offer_id = _offer FOR UPDATE;
  IF o IS NULL OR o.candidate_id <> auth.uid() THEN RAISE EXCEPTION 'Offer not found'; END IF;
  IF o.status <> 'pending' THEN RAISE EXCEPTION 'This offer is no longer open'; END IF;
  IF o.expires_on IS NULL THEN RAISE EXCEPTION 'This offer has no deadline'; END IF;
  IF o.expires_on < current_date - 2 THEN RAISE EXCEPTION 'This offer expired too long ago to extend'; END IF;
  IF o.extension_status = 'requested' THEN RAISE EXCEPTION 'You already requested an extension'; END IF;
  IF _until IS NULL OR _until <= greatest(o.expires_on, current_date) OR _until > greatest(o.expires_on, current_date) + 30 THEN
    RAISE EXCEPTION 'Pick a new date within 30 days after the current deadline'; END IF;
  IF length(coalesce(_note,'')) > 500 THEN RAISE EXCEPTION 'Keep the note under 500 characters'; END IF;
  PERFORM set_config('app.offer_respond', 'on', true);
  UPDATE public.job_offers SET extension_requested_until = _until, extension_note = coalesce(_note,''),
    extension_status = 'requested', extension_responded_at = NULL WHERE offer_id = _offer;
  PERFORM set_config('app.offer_respond', 'off', true);
  SELECT job_title INTO jt FROM public.jobs WHERE job_id = o.job_id;
  PERFORM public.create_notification(o.recruiter_id, 'recruiter', 'offer_extension_requested', 'pipeline', 'Offer extension requested',
    coalesce(public.person_name(o.candidate_id), 'The candidate') || ' asked for more time on ' || coalesce(jt,'the role') || ' (until ' || to_char(_until,'Mon DD') || ').',
    '/recruiter/pipeline/' || o.job_id || '?candidate=' || o.candidate_id, 'high', 'offer-ext:' || _offer || ':' || _until);
END $$;
REVOKE EXECUTE ON FUNCTION public.request_offer_extension(uuid, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_offer_extension(uuid, date, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.respond_offer_extension(_offer uuid, _grant boolean, _until date DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.job_offers; jt text; d date; url text;
BEGIN
  SELECT * INTO o FROM public.job_offers WHERE offer_id = _offer FOR UPDATE;
  IF o IS NULL OR o.recruiter_id <> auth.uid() OR NOT public.owns_job(o.job_id) THEN RAISE EXCEPTION 'Offer not found'; END IF;
  IF o.status <> 'pending' THEN RAISE EXCEPTION 'This offer is no longer open'; END IF;
  d := coalesce(_until, o.extension_requested_until);
  IF _grant AND (d IS NULL OR d < current_date) THEN RAISE EXCEPTION 'Pick a deadline today or later'; END IF;
  IF NOT _grant AND o.extension_status <> 'requested' THEN RAISE EXCEPTION 'No extension request to decline'; END IF;
  PERFORM set_config('app.offer_respond', 'on', true);
  UPDATE public.job_offers SET
    expires_on = CASE WHEN _grant THEN d ELSE expires_on END,
    extension_status = CASE WHEN _grant THEN 'granted' ELSE 'declined' END,
    extension_responded_at = now() WHERE offer_id = _offer;
  PERFORM set_config('app.offer_respond', 'off', true);
  SELECT job_title INTO jt FROM public.jobs WHERE job_id = o.job_id;
  url := CASE WHEN o.application_id IS NULL THEN '/candidate/applications' ELSE '/candidate/applications/' || o.application_id END;
  PERFORM public.create_notification(o.candidate_id, 'candidate', 'offer_extension_' || CASE WHEN _grant THEN 'granted' ELSE 'declined' END, 'application',
    CASE WHEN _grant THEN 'More time to decide' ELSE 'Extension not granted' END,
    CASE WHEN _grant THEN 'Your offer for ' || coalesce(jt,'the role') || ' now runs until ' || to_char(d,'Mon DD, YYYY') || '.'
         ELSE 'The hiring team kept the original deadline for ' || coalesce(jt,'the role') || '.' END,
    url, 'high', 'offer-ext-resp:' || _offer || ':' || now()::text);
END $$;
REVOKE EXECUTE ON FUNCTION public.respond_offer_extension(uuid, boolean, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_offer_extension(uuid, boolean, date) TO authenticated;