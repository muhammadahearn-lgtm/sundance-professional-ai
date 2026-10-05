CREATE TABLE public.countries (
  country_name text PRIMARY KEY,
  normalized_name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 100
);
GRANT SELECT ON public.countries TO anon, authenticated;
GRANT ALL ON public.countries TO service_role;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Countries readable" ON public.countries FOR SELECT USING (true);

INSERT INTO public.countries (country_name, normalized_name, sort_order)
SELECT n, lower(regexp_replace(n, '[^A-Za-z0-9]+', '_', 'g')), CASE WHEN n = 'United States' THEN 1 WHEN n = 'Canada' THEN 2 WHEN n = 'United Kingdom' THEN 3 ELSE 100 END
FROM unnest(ARRAY['Argentina','Australia','Austria','Bangladesh','Belgium','Brazil','Bulgaria','Canada','Chile','China','Colombia','Costa Rica','Croatia','Czech Republic','Denmark','Egypt','Estonia','Finland','France','Germany','Ghana','Greece','Hong Kong','Hungary','India','Indonesia','Ireland','Israel','Italy','Japan','Kenya','Latvia','Lithuania','Luxembourg','Malaysia','Mexico','Morocco','Netherlands','New Zealand','Nigeria','Norway','Pakistan','Peru','Philippines','Poland','Portugal','Qatar','Romania','Saudi Arabia','Serbia','Singapore','Slovakia','Slovenia','South Africa','South Korea','Spain','Sri Lanka','Sweden','Switzerland','Taiwan','Thailand','Turkey','Ukraine','United Arab Emirates','United Kingdom','United States','Uruguay','Vietnam']) AS n;

CREATE OR REPLACE FUNCTION public.location_key(_v text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT trim(both '_' from lower(regexp_replace(coalesce(_v, ''), '[^A-Za-z0-9]+', '_', 'g')))
$$;

CREATE OR REPLACE FUNCTION public.location_title(_v text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT initcap(regexp_replace(trim(coalesce(_v, '')), '\s+', ' ', 'g'))
$$;

ALTER TABLE public.candidate_profiles
  ADD COLUMN location_country text NOT NULL DEFAULT '', ADD COLUMN location_state text NOT NULL DEFAULT '', ADD COLUMN location_city text NOT NULL DEFAULT '',
  ADD COLUMN location_state_key text NOT NULL DEFAULT '', ADD COLUMN location_city_key text NOT NULL DEFAULT '';
ALTER TABLE public.jobs
  ADD COLUMN location_country text NOT NULL DEFAULT '', ADD COLUMN location_state text NOT NULL DEFAULT '', ADD COLUMN location_city text NOT NULL DEFAULT '',
  ADD COLUMN location_state_key text NOT NULL DEFAULT '', ADD COLUMN location_city_key text NOT NULL DEFAULT '';
ALTER TABLE public.recruiter_profiles
  ADD COLUMN location_country text NOT NULL DEFAULT '', ADD COLUMN location_state text NOT NULL DEFAULT '', ADD COLUMN location_city text NOT NULL DEFAULT '',
  ADD COLUMN location_state_key text NOT NULL DEFAULT '', ADD COLUMN location_city_key text NOT NULL DEFAULT '';

-- Normalizes parts, rejects unknown countries, and rebuilds the display string "City, State, Country".
CREATE OR REPLACE FUNCTION public.location_normalize() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE c text;
BEGIN
  NEW.location_state := location_title(NEW.location_state);
  NEW.location_city := location_title(NEW.location_city);
  IF trim(NEW.location_country) <> '' THEN
    SELECT country_name INTO c FROM countries WHERE normalized_name = location_key(NEW.location_country);
    IF c IS NULL THEN RAISE EXCEPTION 'Please pick a country from the list.'; END IF;
    NEW.location_country := c;
  ELSE
    NEW.location_country := '';
  END IF;
  NEW.location_state_key := location_key(NEW.location_state);
  NEW.location_city_key := location_key(NEW.location_city);
  IF NEW.location_country <> '' OR NEW.location_state <> '' OR NEW.location_city <> '' THEN
    NEW.location := array_to_string(array_remove(ARRAY[NULLIF(NEW.location_city, ''), NULLIF(NEW.location_state, ''), NULLIF(NEW.location_country, '')], NULL), ', ');
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.location_normalize() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER candidate_location_normalize BEFORE INSERT OR UPDATE ON public.candidate_profiles FOR EACH ROW EXECUTE FUNCTION public.location_normalize();
CREATE TRIGGER jobs_location_normalize BEFORE INSERT OR UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.location_normalize();
CREATE TRIGGER recruiter_location_normalize BEFORE INSERT OR UPDATE ON public.recruiter_profiles FOR EACH ROW EXECUTE FUNCTION public.location_normalize();

CREATE INDEX jobs_location_parts_idx ON public.jobs (location_country, location_state_key, location_city_key);

-- Backfill known free-text values.
UPDATE public.candidate_profiles SET location_city = split_part(location, ',', 1), location_state = CASE WHEN location ILIKE '%TX%' THEN 'Texas' WHEN location ILIKE '%boston%' OR location ILIKE '%MA' THEN 'Massachusetts' ELSE '' END, location_country = 'United States' WHERE location ~* '^(austin|boston)';
UPDATE public.recruiter_profiles SET location_city = split_part(location, ',', 1), location_state = CASE WHEN location ILIKE '%TX%' THEN 'Texas' WHEN location ILIKE '%boston%' OR location ILIKE '%MA' THEN 'Massachusetts' ELSE '' END, location_country = 'United States' WHERE location ~* '^(austin|boston)';
ALTER TABLE public.jobs DISABLE TRIGGER USER;
UPDATE public.jobs SET location_city = initcap(trim(split_part(location, ',', 1))), location_state = CASE WHEN location ILIKE '%TX%' THEN 'Texas' ELSE 'Massachusetts' END, location_country = 'United States',
  location = initcap(trim(split_part(location, ',', 1))) || ', ' || CASE WHEN location ILIKE '%TX%' THEN 'Texas' ELSE 'Massachusetts' END || ', United States',
  location_city_key = lower(trim(split_part(location, ',', 1))), location_state_key = CASE WHEN location ILIKE '%TX%' THEN 'texas' ELSE 'massachusetts' END
  WHERE location ~* '^(austin|boston)';
ALTER TABLE public.jobs ENABLE TRIGGER USER;