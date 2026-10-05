INSERT INTO public.technology_categories(category_name) VALUES ('Other') ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.add_taxonomy_entry(_kind text, _name text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k text := public.taxonomy_key(_name); d text := public.taxonomy_display(_name); rid uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF k = '' OR length(d) > 60 THEN RAISE EXCEPTION 'Please enter a name of 1–60 characters.'; END IF;
  IF _kind = 'language' THEN
    SELECT language_id INTO rid FROM public.programming_languages WHERE normalized_name = k;
    IF rid IS NULL THEN INSERT INTO public.programming_languages(language_name) VALUES (d) ON CONFLICT (normalized_name) DO NOTHING RETURNING language_id INTO rid;
      IF rid IS NULL THEN SELECT language_id INTO rid FROM public.programming_languages WHERE normalized_name = k; END IF; END IF;
  ELSIF _kind = 'skill' THEN
    SELECT skill_id INTO rid FROM public.technical_skills WHERE normalized_name = k;
    IF rid IS NULL THEN INSERT INTO public.technical_skills(skill_name) VALUES (d) ON CONFLICT (normalized_name) DO NOTHING RETURNING skill_id INTO rid;
      IF rid IS NULL THEN SELECT skill_id INTO rid FROM public.technical_skills WHERE normalized_name = k; END IF; END IF;
  ELSIF _kind = 'technology' THEN
    SELECT technology_id INTO rid FROM public.technologies WHERE normalized_name = k;
    IF rid IS NULL THEN INSERT INTO public.technologies(technology_name, technology_category) VALUES (d, 'Other') ON CONFLICT (normalized_name) DO NOTHING RETURNING technology_id INTO rid;
      IF rid IS NULL THEN SELECT technology_id INTO rid FROM public.technologies WHERE normalized_name = k; END IF; END IF;
  ELSIF _kind = 'soft_skill' THEN
    SELECT soft_skill_id INTO rid FROM public.soft_skills WHERE normalized_name = k;
    IF rid IS NULL THEN INSERT INTO public.soft_skills(soft_skill_name) VALUES (d) ON CONFLICT (normalized_name) DO NOTHING RETURNING soft_skill_id INTO rid;
      IF rid IS NULL THEN SELECT soft_skill_id INTO rid FROM public.soft_skills WHERE normalized_name = k; END IF; END IF;
  ELSE RAISE EXCEPTION 'Unknown kind'; END IF;
  RETURN rid;
END $$;
REVOKE ALL ON FUNCTION public.add_taxonomy_entry(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_taxonomy_entry(text, text) TO authenticated;