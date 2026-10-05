ALTER TABLE public.education ADD COLUMN IF NOT EXISTS degree_type text;
ALTER TABLE public.education ADD COLUMN IF NOT EXISTS field_of_study_key text NOT NULL DEFAULT '';
ALTER TABLE public.education ADD COLUMN IF NOT EXISTS institution_key text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.education_degree_from_text(_v text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _v IS NULL OR btrim(_v) = '' THEN NULL
    WHEN _v ~* '(ph\.?\s?d|doctor)' THEN 'Doctorate (PhD)'
    WHEN _v ~* '(master|\mm\.?s\.?c?\M|\mm\.?a\.?\M|mba|\mm\.?eng)' THEN 'Master''s Degree'
    WHEN _v ~* '(bachelor|\mb\.?s\.?c?\M|\mb\.?a\.?\M|\mb\.?eng|undergrad)' THEN 'Bachelor''s Degree'
    WHEN _v ~* '(associate|\ma\.?a\.?s?\M)' THEN 'Associate Degree'
    WHEN _v ~* '(\mj\.?d\.?\M|\mm\.?d\.?\M|professional)' THEN 'Professional Degree'
    WHEN _v ~* 'bootcamp' THEN 'Bootcamp'
    WHEN _v ~* 'certific' THEN 'Certificate Program'
    WHEN _v ~* '(high school|diploma|ged)' THEN 'High School Diploma'
    ELSE NULL END
$$;

CREATE OR REPLACE FUNCTION public.education_normalize() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.field_of_study := COALESCE(public.taxonomy_display(COALESCE(NEW.field_of_study, '')), '');
  NEW.institution_name := COALESCE(public.taxonomy_display(COALESCE(NEW.institution_name, '')), '');
  NEW.field_of_study_key := COALESCE(public.taxonomy_key(NEW.field_of_study), '');
  NEW.institution_key := COALESCE(public.taxonomy_key(NEW.institution_name), '');
  IF NEW.degree_type IS NOT NULL THEN NEW.degree := NEW.degree_type; END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.education_normalize() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS education_normalize ON public.education;
CREATE TRIGGER education_normalize BEFORE INSERT OR UPDATE ON public.education FOR EACH ROW EXECUTE FUNCTION public.education_normalize();

UPDATE public.education SET degree_type = public.education_degree_from_text(degree) WHERE degree_type IS NULL;

ALTER TABLE public.education ADD CONSTRAINT education_degree_type_check CHECK (degree_type IS NULL OR degree_type IN ('High School Diploma','Associate Degree','Bachelor''s Degree','Master''s Degree','Doctorate (PhD)','Professional Degree','Certificate Program','Bootcamp'));
ALTER TABLE public.education ADD CONSTRAINT education_grad_year_check CHECK (graduation_year IS NULL OR graduation_year BETWEEN 1900 AND 2100);
CREATE INDEX IF NOT EXISTS education_field_key_idx ON public.education(field_of_study_key);
CREATE INDEX IF NOT EXISTS education_institution_key_idx ON public.education(institution_key);

CREATE OR REPLACE FUNCTION public.education_suggestions() RETURNS TABLE(kind text, name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT 'field'::text, field_of_study FROM public.education WHERE field_of_study <> ''
  UNION SELECT DISTINCT 'institution'::text, institution_name FROM public.education WHERE institution_name <> ''
$$;
REVOKE EXECUTE ON FUNCTION public.education_suggestions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.education_suggestions() TO authenticated;