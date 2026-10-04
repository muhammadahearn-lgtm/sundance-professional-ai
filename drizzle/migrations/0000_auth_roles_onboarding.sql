CREATE TYPE public.app_role AS ENUM ('candidate', 'recruiter');
CREATE TYPE public.user_status AS ENUM ('active', 'inactive', 'suspended');

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY,
  email text NOT NULL,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  status public.user_status NOT NULL DEFAULT 'active',
  email_verified boolean NOT NULL DEFAULT false,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (first_name, last_name) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.candidate_profiles (
  user_id uuid PRIMARY KEY,
  job_title text NOT NULL DEFAULT '',
  years_experience integer NOT NULL DEFAULT 0,
  location text NOT NULL DEFAULT '',
  headline text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  programming_languages text[] NOT NULL DEFAULT '{}',
  technical_skills text[] NOT NULL DEFAULT '{}',
  tools text[] NOT NULL DEFAULT '{}',
  target_roles text[] NOT NULL DEFAULT '{}',
  salary_expectation text NOT NULL DEFAULT '',
  availability text NOT NULL DEFAULT 'open',
  work_arrangement text NOT NULL DEFAULT 'remote',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.candidate_profiles TO authenticated;
GRANT ALL ON public.candidate_profiles TO service_role;
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Candidates read own" ON public.candidate_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Candidates insert own" ON public.candidate_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'candidate'));
CREATE POLICY "Candidates update own" ON public.candidate_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'candidate'));
CREATE TRIGGER candidate_profiles_updated_at BEFORE UPDATE ON public.candidate_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.recruiter_profiles (
  user_id uuid PRIMARY KEY,
  title text NOT NULL DEFAULT '',
  specialization text NOT NULL DEFAULT '',
  years_experience integer NOT NULL DEFAULT 0,
  location text NOT NULL DEFAULT '',
  company_name text NOT NULL DEFAULT '',
  company_website text NOT NULL DEFAULT '',
  industry text NOT NULL DEFAULT '',
  company_description text NOT NULL DEFAULT '',
  organization_type text NOT NULL DEFAULT 'corporate',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.recruiter_profiles TO authenticated;
GRANT ALL ON public.recruiter_profiles TO service_role;
ALTER TABLE public.recruiter_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recruiters read own" ON public.recruiter_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Recruiters insert own" ON public.recruiter_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'recruiter'));
CREATE POLICY "Recruiters update own" ON public.recruiter_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'recruiter'));
CREATE TRIGGER recruiter_profiles_updated_at BEFORE UPDATE ON public.recruiter_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.complete_onboarding()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.app_role;
BEGIN
  SELECT role INTO r FROM public.user_roles WHERE user_id = auth.uid();
  IF r IS NULL THEN RAISE EXCEPTION 'No role'; END IF;
  IF r = 'candidate' AND NOT EXISTS (SELECT 1 FROM public.candidate_profiles WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Candidate profile missing'; END IF;
  IF r = 'recruiter' AND NOT EXISTS (SELECT 1 FROM public.recruiter_profiles WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Recruiter profile missing'; END IF;
  UPDATE public.profiles SET onboarding_completed = true, email_verified = true WHERE user_id = auth.uid();
END; $$;
REVOKE EXECUTE ON FUNCTION public.complete_onboarding() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_onboarding() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.app_role;
BEGIN
  r := CASE WHEN NEW.raw_user_meta_data->>'role' = 'recruiter' THEN 'recruiter'::public.app_role ELSE 'candidate'::public.app_role END;
  INSERT INTO public.profiles (user_id, email, first_name, last_name, email_verified)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'first_name', ''), COALESCE(NEW.raw_user_meta_data->>'last_name', ''), NEW.email_confirmed_at IS NOT NULL);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, r);
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();