CREATE OR REPLACE FUNCTION public.cert_key(_v text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT COALESCE(string_agg(w, ' ' ORDER BY w), '') FROM (
    SELECT DISTINCT CASE WHEN length(t) > 3 AND t ~ '[^s]s$' THEN left(t, length(t) - 1) ELSE t END AS w
    FROM regexp_split_to_table(regexp_replace(lower(COALESCE(_v, '')), '[^a-z0-9+#]+', ' ', 'g'), '\s+') AS t
    WHERE t <> '' AND t NOT IN ('the','of','and','in','for','a','an','-')
  ) s
$$;

CREATE TABLE public.certification_catalog (
  catalog_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  abbreviation text NOT NULL DEFAULT '',
  issuer text NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  aliases text[] NOT NULL DEFAULT '{}',
  name_key text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.certification_catalog TO authenticated;
GRANT ALL ON public.certification_catalog TO service_role;
ALTER TABLE public.certification_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read certification catalog" ON public.certification_catalog FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.cert_catalog_key() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.name_key := public.cert_key(NEW.name); RETURN NEW; END $$;
REVOKE EXECUTE ON FUNCTION public.cert_catalog_key() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER cert_catalog_key BEFORE INSERT OR UPDATE ON public.certification_catalog FOR EACH ROW EXECUTE FUNCTION public.cert_catalog_key();
CREATE UNIQUE INDEX certification_catalog_name_key_idx ON public.certification_catalog(name_key);

ALTER TABLE public.certifications ADD COLUMN IF NOT EXISTS catalog_id uuid REFERENCES public.certification_catalog(catalog_id) ON DELETE SET NULL;
ALTER TABLE public.certifications ADD COLUMN IF NOT EXISTS name_key text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.certification_normalize() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE c public.certification_catalog; k text;
BEGIN
  IF NEW.catalog_id IS NULL THEN
    k := public.cert_key(NEW.certification_name);
    SELECT * INTO c FROM public.certification_catalog cc
      WHERE cc.name_key = k OR (cc.abbreviation <> '' AND public.cert_key(cc.abbreviation) = k)
         OR EXISTS (SELECT 1 FROM unnest(cc.aliases) a WHERE public.cert_key(a) = k)
      LIMIT 1;
    IF FOUND THEN NEW.catalog_id := c.catalog_id; END IF;
  ELSE
    SELECT * INTO c FROM public.certification_catalog WHERE catalog_id = NEW.catalog_id;
  END IF;
  IF c.catalog_id IS NOT NULL THEN
    NEW.certification_name := c.name;
    NEW.issuing_organization := c.issuer;
  ELSE
    NEW.certification_name := COALESCE(public.taxonomy_display(COALESCE(NEW.certification_name, '')), '');
    NEW.issuing_organization := COALESCE(public.taxonomy_display(COALESCE(NEW.issuing_organization, '')), '');
  END IF;
  NEW.name_key := public.cert_key(NEW.certification_name);
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.certification_normalize() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER certification_normalize BEFORE INSERT OR UPDATE ON public.certifications FOR EACH ROW EXECUTE FUNCTION public.certification_normalize();
CREATE INDEX IF NOT EXISTS certifications_name_key_idx ON public.certifications(name_key);