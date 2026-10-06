CREATE OR REPLACE FUNCTION public.add_role_entry(_name text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE n text := btrim(_name); d text; k text; rid uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  n := regexp_replace(n, '^(?:(?:junior|jr\.?|mid[- ]?level|mid|senior|sr\.?|lead|staff|principal|entry[- ]level|associate|intern)\s+)+', '', 'i');
  d := public.taxonomy_display(n); k := public.taxonomy_key(n);
  IF k = '' OR length(d) < 2 OR length(d) > 60 THEN RAISE EXCEPTION 'Please enter a role name of 2–60 characters.'; END IF;
  SELECT role_id INTO rid FROM public.roles WHERE public.taxonomy_key(role_name) = k AND is_active LIMIT 1;
  IF rid IS NULL THEN
    INSERT INTO public.roles(role_name, category, sort_order, is_active) VALUES (d, 'Other Tech Roles', 1000, true)
    ON CONFLICT (role_name) DO UPDATE SET is_active = true RETURNING role_id INTO rid;
  END IF;
  RETURN rid;
END $function$;
REVOKE ALL ON FUNCTION public.add_role_entry(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_role_entry(text) TO authenticated;