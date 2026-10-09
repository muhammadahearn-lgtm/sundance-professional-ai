ALTER TABLE public.job_offers ADD COLUMN negotiated_at timestamptz, ADD COLUMN negotiation_conversation_id uuid;

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
      NEW.negotiated_at = NULL;
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.job_offers_guard() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.request_offer_negotiation(_offer uuid, _message text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.job_offers; conv uuid; jt text;
BEGIN
  SELECT * INTO o FROM public.job_offers WHERE offer_id = _offer FOR UPDATE;
  IF o IS NULL OR o.candidate_id <> auth.uid() THEN RAISE EXCEPTION 'Offer not found'; END IF;
  IF o.status <> 'pending' THEN RAISE EXCEPTION 'This offer is no longer open'; END IF;
  IF o.expires_on IS NOT NULL AND o.expires_on < current_date THEN RAISE EXCEPTION 'This offer has expired'; END IF;
  IF length(coalesce(_message, '')) = 0 OR length(_message) > 3000 THEN RAISE EXCEPTION 'Message must be 1-3000 characters'; END IF;
  conv := public.start_conversation(o.candidate_id, o.job_id);
  INSERT INTO public.messages(conversation_id, sender_id, sender_type, message_body) VALUES (conv, o.candidate_id, 'candidate', _message);
  PERFORM set_config('app.offer_respond', 'on', true);
  UPDATE public.job_offers SET negotiated_at = now(), negotiation_conversation_id = conv WHERE offer_id = _offer;
  PERFORM set_config('app.offer_respond', 'off', true);
  SELECT job_title INTO jt FROM public.jobs WHERE job_id = o.job_id;
  PERFORM public.create_notification(o.recruiter_id, 'recruiter', 'offer_negotiation', 'pipeline', 'Offer discussion requested',
    coalesce(public.person_name(o.candidate_id), 'The candidate') || ' wants to discuss the offer for ' || coalesce(jt, 'the role') || '.',
    '/recruiter/messages/' || conv, 'high', 'offer-negotiation:' || o.offer_id || ':' || o.revision);
  RETURN conv;
END $$;
REVOKE EXECUTE ON FUNCTION public.request_offer_negotiation(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_offer_negotiation(uuid, text) TO authenticated;