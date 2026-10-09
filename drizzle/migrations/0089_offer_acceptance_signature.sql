ALTER TABLE public.job_offers ADD COLUMN IF NOT EXISTS signed_name text, ADD COLUMN IF NOT EXISTS signed_at timestamptz;

CREATE OR REPLACE FUNCTION public.job_offers_signature_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_setting('app.offer_sign', true) IS DISTINCT FROM 'on' THEN
    IF TG_OP = 'INSERT' THEN NEW.signed_name := NULL; NEW.signed_at := NULL;
    ELSIF (NEW.signed_name, NEW.signed_at) IS DISTINCT FROM (OLD.signed_name, OLD.signed_at) THEN
      RAISE EXCEPTION 'Signatures can only be recorded by the candidate';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS job_offers_signature_guard ON public.job_offers;
CREATE TRIGGER job_offers_signature_guard BEFORE INSERT OR UPDATE ON public.job_offers FOR EACH ROW EXECUTE FUNCTION public.job_offers_signature_guard();
REVOKE EXECUTE ON FUNCTION public.job_offers_signature_guard() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sign_and_accept_offer(_offer uuid, _name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.job_offers; n text := btrim(regexp_replace(coalesce(_name, ''), '\s+', ' ', 'g'));
BEGIN
  SELECT * INTO o FROM public.job_offers WHERE offer_id = _offer;
  IF o IS NULL OR o.candidate_id <> auth.uid() THEN RAISE EXCEPTION 'Offer not found'; END IF;
  IF length(n) < 3 OR length(n) > 120 OR position(' ' in n) = 0 THEN RAISE EXCEPTION 'Type your full legal name (first and last) to sign'; END IF;
  PERFORM public.respond_to_offer(_offer, true, '');
  PERFORM set_config('app.offer_sign', 'on', true);
  PERFORM set_config('app.offer_respond', 'on', true);
  UPDATE public.job_offers SET signed_name = n, signed_at = now() WHERE offer_id = _offer;
  PERFORM set_config('app.offer_respond', 'off', true);
  PERFORM set_config('app.offer_sign', 'off', true);
END $$;
REVOKE EXECUTE ON FUNCTION public.sign_and_accept_offer(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sign_and_accept_offer(uuid, text) TO authenticated;