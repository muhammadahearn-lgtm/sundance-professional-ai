ALTER TABLE public.interviews ADD COLUMN custom_round_name text NOT NULL DEFAULT '';
CREATE OR REPLACE FUNCTION public.interviews_validate()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.format = 'online' AND NEW.meeting_url !~* '^https://' THEN RAISE EXCEPTION 'Please add a meeting link starting with https://'; END IF;
  IF NEW.format = 'in_person' AND length(trim(NEW.location_address)) < 5 THEN RAISE EXCEPTION 'Please add the interview address'; END IF;
  IF NEW.duration_minutes < 10 OR NEW.duration_minutes > 480 THEN RAISE EXCEPTION 'Duration must be between 10 and 480 minutes'; END IF;
  IF NEW.round_number < 1 OR NEW.round_number > 10 THEN RAISE EXCEPTION 'Round must be between 1 and 10'; END IF;
  NEW.custom_round_name := trim(coalesce(NEW.custom_round_name, ''));
  IF NEW.interview_type = 'custom' AND length(NEW.custom_round_name) < 2 THEN RAISE EXCEPTION 'Please enter a round name'; END IF;
  IF length(NEW.custom_round_name) > 60 THEN RAISE EXCEPTION 'Round name must be 60 characters or fewer'; END IF;
  IF NEW.interview_type <> 'custom' THEN NEW.custom_round_name := ''; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $function$;