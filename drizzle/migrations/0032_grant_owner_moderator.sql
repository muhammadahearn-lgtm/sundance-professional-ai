INSERT INTO public.moderators (user_id)
SELECT id FROM auth.users WHERE lower(email) = 'muhammad@sundanceprofessionals.com'
ON CONFLICT (user_id) DO NOTHING;