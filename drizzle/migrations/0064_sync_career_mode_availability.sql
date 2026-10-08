CREATE OR REPLACE FUNCTION public.sync_career_mode_availability()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.career_mode IS DISTINCT FROM OLD.career_mode THEN
    NEW.availability := CASE NEW.career_mode WHEN 'passive' THEN 'open' WHEN 'not_looking' THEN 'not_looking' ELSE 'active' END;
  ELSIF TG_OP = 'UPDATE' AND NEW.availability IS DISTINCT FROM OLD.availability THEN
    NEW.career_mode := CASE NEW.availability WHEN 'open' THEN 'passive' WHEN 'not_looking' THEN 'not_looking' ELSE 'active' END;
  ELSIF TG_OP = 'INSERT' THEN
    NEW.career_mode := CASE NEW.availability WHEN 'open' THEN 'passive' WHEN 'not_looking' THEN 'not_looking' ELSE 'active' END;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_career_mode_availability() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS sync_career_mode_availability ON public.candidate_profiles;
CREATE TRIGGER sync_career_mode_availability BEFORE INSERT OR UPDATE OF career_mode, availability ON public.candidate_profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_career_mode_availability();
UPDATE public.candidate_profiles SET availability = CASE career_mode WHEN 'passive' THEN 'open' WHEN 'not_looking' THEN 'not_looking' ELSE 'active' END
WHERE availability IS DISTINCT FROM CASE career_mode WHEN 'passive' THEN 'open' WHEN 'not_looking' THEN 'not_looking' ELSE 'active' END;