CREATE OR REPLACE FUNCTION public.taxonomy_key(_v text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT trim(both '_' from regexp_replace(lower(btrim(coalesce(_v,''))), '[^a-z0-9#+.]+', '_', 'g'))
$$;

CREATE OR REPLACE FUNCTION public.taxonomy_display(_v text) RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE s text := regexp_replace(btrim(coalesce(_v,'')), '\s+', ' ', 'g'); w text; out text[] := '{}'; all_upper boolean;
BEGIN
  all_upper := s = upper(s) AND s <> lower(s) AND position(' ' in s) > 0;
  FOREACH w IN ARRAY string_to_array(s, ' ') LOOP
    IF w = lower(w) OR all_upper THEN out := out || (upper(left(w,1)) || lower(substr(w,2)));
    ELSE out := out || w; END IF;
  END LOOP;
  RETURN array_to_string(out, ' ');
END $$;

CREATE OR REPLACE FUNCTION public.taxonomy_normalize() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE col text := TG_ARGV[0]; v text;
BEGIN
  v := public.taxonomy_display(to_jsonb(NEW)->>col);
  NEW := jsonb_populate_record(NEW, jsonb_build_object(col, v, 'normalized_name', public.taxonomy_key(v)));
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.taxonomy_normalize() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.programming_languages ADD COLUMN normalized_name text;
ALTER TABLE public.technical_skills ADD COLUMN normalized_name text;
ALTER TABLE public.technologies ADD COLUMN normalized_name text;
ALTER TABLE public.soft_skills ADD COLUMN normalized_name text;

CREATE TRIGGER taxonomy_normalize BEFORE INSERT OR UPDATE ON public.programming_languages FOR EACH ROW EXECUTE FUNCTION public.taxonomy_normalize('language_name');
CREATE TRIGGER taxonomy_normalize BEFORE INSERT OR UPDATE ON public.technical_skills FOR EACH ROW EXECUTE FUNCTION public.taxonomy_normalize('skill_name');
CREATE TRIGGER taxonomy_normalize BEFORE INSERT OR UPDATE ON public.technologies FOR EACH ROW EXECUTE FUNCTION public.taxonomy_normalize('technology_name');
CREATE TRIGGER taxonomy_normalize BEFORE INSERT OR UPDATE ON public.soft_skills FOR EACH ROW EXECUTE FUNCTION public.taxonomy_normalize('soft_skill_name');

UPDATE public.programming_languages SET language_name = language_name;
UPDATE public.technical_skills SET skill_name = skill_name;
UPDATE public.technologies SET technology_name = technology_name;
UPDATE public.soft_skills SET soft_skill_name = soft_skill_name;

CREATE UNIQUE INDEX programming_languages_normalized_uq ON public.programming_languages(normalized_name);
CREATE UNIQUE INDEX technical_skills_normalized_uq ON public.technical_skills(normalized_name);
CREATE UNIQUE INDEX technologies_normalized_uq ON public.technologies(normalized_name);
CREATE UNIQUE INDEX soft_skills_normalized_uq ON public.soft_skills(normalized_name);