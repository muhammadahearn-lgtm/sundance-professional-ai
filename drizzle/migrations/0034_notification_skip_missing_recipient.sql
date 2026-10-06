CREATE OR REPLACE FUNCTION public.create_notification(_recipient uuid, _rtype app_role, _type text, _category text, _title text, _message text, _url text, _priority notification_priority, _dedupe text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE p public.notification_preferences; has_prefs boolean; allowed boolean;
BEGIN
  IF _recipient IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _recipient) THEN RETURN; END IF;
  SELECT * INTO p FROM public.notification_preferences WHERE user_id = _recipient;
  has_prefs := FOUND;
  allowed := CASE _category WHEN 'application' THEN p.application WHEN 'messaging' THEN p.messaging WHEN 'pipeline' THEN p.pipeline
     WHEN 'recommendation' THEN p.recommendation WHEN 'career' THEN p.career WHEN 'match' THEN p.match ELSE true END;
  IF has_prefs AND allowed IS FALSE THEN RETURN; END IF;
  INSERT INTO public.notifications (recipient_id, recipient_type, notification_type, category, title, message, action_url, priority, dedupe_key)
  VALUES (_recipient, _rtype, _type, _category, left(_title, 200), left(coalesce(_message,''), 500), coalesce(_url,''), _priority, _dedupe)
  ON CONFLICT (recipient_id, dedupe_key) DO NOTHING;
END $function$;