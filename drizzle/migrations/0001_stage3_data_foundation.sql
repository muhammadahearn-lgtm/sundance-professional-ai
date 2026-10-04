-- Enums
CREATE TYPE public.visibility_status AS ENUM ('public','recruiter_searchable','private');
CREATE TYPE public.organization_type AS ENUM ('corporate_employer','staffing_agency','executive_search_firm','consulting_firm','independent_recruiter');
CREATE TYPE public.employment_type AS ENUM ('full_time','part_time','contract','consulting','internship');
CREATE TYPE public.work_arrangement AS ENUM ('remote','hybrid','on_site');
CREATE TYPE public.job_status AS ENUM ('draft','active','paused','closed');
CREATE TYPE public.application_status AS ENUM ('applied','viewed','recruiter_contacted','interviewing','offer','hired','rejected');
CREATE TYPE public.pipeline_stage AS ENUM ('saved','contacted','interviewing','shortlisted','offer','hired','rejected');
CREATE TYPE public.proficiency_level AS ENUM ('beginner','intermediate','advanced','expert');

-- Taxonomy lookups
CREATE TABLE public.roles (role_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), role_name text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.programming_languages (language_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), language_name text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.technical_skills (skill_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), skill_name text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.technology_categories (category_name text PRIMARY KEY);
CREATE TABLE public.technologies (technology_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), technology_name text NOT NULL UNIQUE, technology_category text NOT NULL REFERENCES public.technology_categories(category_name), created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.roles, public.programming_languages, public.technical_skills, public.technology_categories, public.technologies TO anon, authenticated;
GRANT ALL ON public.roles, public.programming_languages, public.technical_skills, public.technology_categories, public.technologies TO service_role;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programming_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technology_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technologies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Taxonomy readable" ON public.roles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Taxonomy readable" ON public.programming_languages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Taxonomy readable" ON public.technical_skills FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Taxonomy readable" ON public.technology_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Taxonomy readable" ON public.technologies FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX idx_technologies_category ON public.technologies(technology_category);

-- Companies
CREATE TABLE public.companies (
  company_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  organization_type public.organization_type NOT NULL DEFAULT 'corporate_employer',
  website text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  company_size text NOT NULL DEFAULT '',
  industry text NOT NULL DEFAULT '',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in read companies" ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Recruiters create companies" ON public.companies FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND public.has_role(auth.uid(),'recruiter'));
CREATE POLICY "Creators update companies" ON public.companies FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE INDEX idx_companies_name ON public.companies(company_name);
CREATE INDEX idx_companies_industry ON public.companies(industry);
CREATE TRIGGER companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Extend existing profile tables (candidate_profiles.user_id = candidate id, recruiter_profiles.user_id = recruiter id)
ALTER TABLE public.candidate_profiles
  ADD COLUMN industry_experience text[] NOT NULL DEFAULT '{}',
  ADD COLUMN current_employer text NOT NULL DEFAULT '',
  ADD COLUMN visibility_status public.visibility_status NOT NULL DEFAULT 'recruiter_searchable',
  ADD COLUMN role_id uuid REFERENCES public.roles(role_id);
ALTER TABLE public.recruiter_profiles
  ADD COLUMN company_id uuid REFERENCES public.companies(company_id) ON DELETE SET NULL,
  ADD COLUMN professional_summary text NOT NULL DEFAULT '';
CREATE INDEX idx_cand_job_title ON public.candidate_profiles(job_title);
CREATE INDEX idx_cand_years ON public.candidate_profiles(years_experience);
CREATE INDEX idx_cand_availability ON public.candidate_profiles(availability);
CREATE INDEX idx_cand_location ON public.candidate_profiles(location);
CREATE INDEX idx_cand_visibility ON public.candidate_profiles(visibility_status);
CREATE INDEX idx_cand_role ON public.candidate_profiles(role_id);
CREATE INDEX idx_rec_company ON public.recruiter_profiles(company_id);

-- Helper: is candidate visible to recruiters
CREATE OR REPLACE FUNCTION public.candidate_visible_to_recruiters(_candidate uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.candidate_profiles WHERE user_id = _candidate AND visibility_status IN ('public','recruiter_searchable'))
$$;
CREATE POLICY "Recruiters read searchable candidates" ON public.candidate_profiles FOR SELECT TO authenticated
  USING (visibility_status IN ('public','recruiter_searchable') AND public.has_role(auth.uid(),'recruiter'));

-- Candidate history tables
CREATE TABLE public.work_experience (
  experience_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(user_id) ON DELETE CASCADE,
  company_name text NOT NULL, job_title text NOT NULL, industry text NOT NULL DEFAULT '',
  start_date date, end_date date, current_position boolean NOT NULL DEFAULT false,
  responsibilities text NOT NULL DEFAULT '', technologies_used text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.education (
  education_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(user_id) ON DELETE CASCADE,
  institution_name text NOT NULL, degree text NOT NULL DEFAULT '', field_of_study text NOT NULL DEFAULT '', graduation_year integer,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.certifications (
  certification_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(user_id) ON DELETE CASCADE,
  certification_name text NOT NULL, issuing_organization text NOT NULL DEFAULT '', issue_date date, expiration_date date,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.candidate_languages (
  candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(user_id) ON DELETE CASCADE,
  lookup_id uuid NOT NULL REFERENCES public.programming_languages(language_id) ON DELETE CASCADE,
  proficiency_level public.proficiency_level NOT NULL DEFAULT 'intermediate', years_experience integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (candidate_id, lookup_id)
);
CREATE TABLE public.candidate_skills (
  candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(user_id) ON DELETE CASCADE,
  lookup_id uuid NOT NULL REFERENCES public.technical_skills(skill_id) ON DELETE CASCADE,
  proficiency_level public.proficiency_level NOT NULL DEFAULT 'intermediate', years_experience integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (candidate_id, lookup_id)
);
CREATE TABLE public.candidate_technologies (
  candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(user_id) ON DELETE CASCADE,
  lookup_id uuid NOT NULL REFERENCES public.technologies(technology_id) ON DELETE CASCADE,
  proficiency_level public.proficiency_level NOT NULL DEFAULT 'intermediate', years_experience integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (candidate_id, lookup_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_experience, public.education, public.certifications, public.candidate_languages, public.candidate_skills, public.candidate_technologies TO authenticated;
GRANT ALL ON public.work_experience, public.education, public.certifications, public.candidate_languages, public.candidate_skills, public.candidate_technologies TO service_role;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['work_experience','education','certifications','candidate_languages','candidate_skills','candidate_technologies'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Candidates manage own" ON public.%I FOR ALL TO authenticated USING (candidate_id = auth.uid()) WITH CHECK (candidate_id = auth.uid() AND public.has_role(auth.uid(), ''candidate''))', t);
    EXECUTE format('CREATE POLICY "Recruiters read searchable" ON public.%I FOR SELECT TO authenticated USING (public.has_role(auth.uid(), ''recruiter'') AND public.candidate_visible_to_recruiters(candidate_id))', t);
    EXECUTE format('CREATE INDEX idx_%s_candidate ON public.%I(candidate_id)', t, t);
  END LOOP;
END $$;
CREATE INDEX idx_cand_lang_lookup ON public.candidate_languages(lookup_id);
CREATE INDEX idx_cand_skill_lookup ON public.candidate_skills(lookup_id);
CREATE INDEX idx_cand_tech_lookup ON public.candidate_technologies(lookup_id);
CREATE TRIGGER work_experience_updated_at BEFORE UPDATE ON public.work_experience FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER education_updated_at BEFORE UPDATE ON public.education FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER certifications_updated_at BEFORE UPDATE ON public.certifications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Jobs
CREATE TABLE public.jobs (
  job_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL REFERENCES public.recruiter_profiles(user_id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(company_id) ON DELETE SET NULL,
  job_title text NOT NULL, role_id uuid REFERENCES public.roles(role_id),
  job_description text NOT NULL DEFAULT '',
  employment_type public.employment_type NOT NULL DEFAULT 'full_time',
  work_arrangement public.work_arrangement NOT NULL DEFAULT 'remote',
  location text NOT NULL DEFAULT '',
  minimum_salary integer, maximum_salary integer,
  minimum_years_experience integer NOT NULL DEFAULT 0,
  job_status public.job_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT salary_range CHECK (minimum_salary IS NULL OR maximum_salary IS NULL OR minimum_salary <= maximum_salary)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recruiters manage own jobs" ON public.jobs FOR ALL TO authenticated USING (recruiter_id = auth.uid()) WITH CHECK (recruiter_id = auth.uid() AND public.has_role(auth.uid(),'recruiter'));
CREATE POLICY "Signed-in read active jobs" ON public.jobs FOR SELECT TO authenticated USING (job_status = 'active');
CREATE INDEX idx_jobs_recruiter ON public.jobs(recruiter_id);
CREATE INDEX idx_jobs_company ON public.jobs(company_id);
CREATE INDEX idx_jobs_role ON public.jobs(role_id);
CREATE INDEX idx_jobs_status ON public.jobs(job_status);
CREATE INDEX idx_jobs_min_salary ON public.jobs(minimum_salary);
CREATE INDEX idx_jobs_max_salary ON public.jobs(maximum_salary);
CREATE INDEX idx_jobs_location ON public.jobs(location);
CREATE INDEX idx_jobs_search ON public.jobs(job_status, role_id, work_arrangement, employment_type);
CREATE INDEX idx_jobs_title ON public.jobs(job_title);
CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.owns_job(_job uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.jobs WHERE job_id = _job AND recruiter_id = auth.uid())
$$;
CREATE OR REPLACE FUNCTION public.job_is_active(_job uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.jobs WHERE job_id = _job AND job_status = 'active')
$$;

CREATE TABLE public.job_languages (job_id uuid NOT NULL REFERENCES public.jobs(job_id) ON DELETE CASCADE, lookup_id uuid NOT NULL REFERENCES public.programming_languages(language_id) ON DELETE CASCADE, required_flag boolean NOT NULL DEFAULT true, PRIMARY KEY (job_id, lookup_id));
CREATE TABLE public.job_skills (job_id uuid NOT NULL REFERENCES public.jobs(job_id) ON DELETE CASCADE, lookup_id uuid NOT NULL REFERENCES public.technical_skills(skill_id) ON DELETE CASCADE, required_flag boolean NOT NULL DEFAULT true, PRIMARY KEY (job_id, lookup_id));
CREATE TABLE public.job_technologies (job_id uuid NOT NULL REFERENCES public.jobs(job_id) ON DELETE CASCADE, lookup_id uuid NOT NULL REFERENCES public.technologies(technology_id) ON DELETE CASCADE, required_flag boolean NOT NULL DEFAULT true, PRIMARY KEY (job_id, lookup_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_languages, public.job_skills, public.job_technologies TO authenticated;
GRANT ALL ON public.job_languages, public.job_skills, public.job_technologies TO service_role;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['job_languages','job_skills','job_technologies'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Job owners manage" ON public.%I FOR ALL TO authenticated USING (public.owns_job(job_id)) WITH CHECK (public.owns_job(job_id))', t);
    EXECUTE format('CREATE POLICY "Read for active jobs" ON public.%I FOR SELECT TO authenticated USING (public.job_is_active(job_id))', t);
    EXECUTE format('CREATE INDEX idx_%s_lookup ON public.%I(lookup_id)', t, t);
  END LOOP;
END $$;

-- Applications
CREATE TABLE public.applications (
  application_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(user_id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(job_id) ON DELETE CASCADE,
  application_date timestamptz NOT NULL DEFAULT now(),
  application_status public.application_status NOT NULL DEFAULT 'applied',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, job_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Candidates read own applications" ON public.applications FOR SELECT TO authenticated USING (candidate_id = auth.uid());
CREATE POLICY "Candidates apply to active jobs" ON public.applications FOR INSERT TO authenticated WITH CHECK (candidate_id = auth.uid() AND public.has_role(auth.uid(),'candidate') AND application_status = 'applied' AND public.job_is_active(job_id));
CREATE POLICY "Candidates withdraw" ON public.applications FOR DELETE TO authenticated USING (candidate_id = auth.uid());
CREATE POLICY "Job owners read applications" ON public.applications FOR SELECT TO authenticated USING (public.owns_job(job_id));
CREATE POLICY "Job owners update status" ON public.applications FOR UPDATE TO authenticated USING (public.owns_job(job_id)) WITH CHECK (public.owns_job(job_id));
CREATE INDEX idx_app_candidate ON public.applications(candidate_id);
CREATE INDEX idx_app_job ON public.applications(job_id, application_status);
CREATE TRIGGER applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Candidate-owned saves/comparisons
CREATE TABLE public.saved_jobs (saved_job_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(user_id) ON DELETE CASCADE, job_id uuid NOT NULL REFERENCES public.jobs(job_id) ON DELETE CASCADE, saved_date timestamptz NOT NULL DEFAULT now(), UNIQUE (candidate_id, job_id));
CREATE TABLE public.job_comparisons (comparison_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(user_id) ON DELETE CASCADE, job_id uuid NOT NULL REFERENCES public.jobs(job_id) ON DELETE CASCADE, comparison_date timestamptz NOT NULL DEFAULT now());
-- Recruiter-owned saves/comparisons
CREATE TABLE public.saved_candidates (saved_candidate_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), recruiter_id uuid NOT NULL REFERENCES public.recruiter_profiles(user_id) ON DELETE CASCADE, candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(user_id) ON DELETE CASCADE, saved_date timestamptz NOT NULL DEFAULT now(), UNIQUE (recruiter_id, candidate_id));
CREATE TABLE public.saved_searches (saved_search_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), recruiter_id uuid NOT NULL REFERENCES public.recruiter_profiles(user_id) ON DELETE CASCADE, search_name text NOT NULL, search_criteria jsonb NOT NULL DEFAULT '{}', created_date timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.candidate_comparisons (comparison_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), recruiter_id uuid NOT NULL REFERENCES public.recruiter_profiles(user_id) ON DELETE CASCADE, candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(user_id) ON DELETE CASCADE, comparison_date timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.recruiting_pipeline (pipeline_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), recruiter_id uuid NOT NULL REFERENCES public.recruiter_profiles(user_id) ON DELETE CASCADE, candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(user_id) ON DELETE CASCADE, job_id uuid REFERENCES public.jobs(job_id) ON DELETE CASCADE, current_stage public.pipeline_stage NOT NULL DEFAULT 'saved', stage_date timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (recruiter_id, candidate_id, job_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_jobs, public.job_comparisons, public.saved_candidates, public.saved_searches, public.candidate_comparisons, public.recruiting_pipeline TO authenticated;
GRANT ALL ON public.saved_jobs, public.job_comparisons, public.saved_candidates, public.saved_searches, public.candidate_comparisons, public.recruiting_pipeline TO service_role;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['saved_jobs','job_comparisons'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Candidates manage own" ON public.%I FOR ALL TO authenticated USING (candidate_id = auth.uid()) WITH CHECK (candidate_id = auth.uid() AND public.has_role(auth.uid(), ''candidate''))', t);
    EXECUTE format('CREATE INDEX idx_%s_candidate ON public.%I(candidate_id)', t, t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['saved_candidates','saved_searches','candidate_comparisons','recruiting_pipeline'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Recruiters manage own" ON public.%I FOR ALL TO authenticated USING (recruiter_id = auth.uid()) WITH CHECK (recruiter_id = auth.uid() AND public.has_role(auth.uid(), ''recruiter''))', t);
    EXECUTE format('CREATE INDEX idx_%s_recruiter ON public.%I(recruiter_id)', t, t);
  END LOOP;
END $$;
CREATE INDEX idx_pipeline_stage ON public.recruiting_pipeline(recruiter_id, current_stage);
CREATE TRIGGER pipeline_updated_at BEFORE UPDATE ON public.recruiting_pipeline FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Match intelligence (written by the server only)
CREATE TABLE public.match_scores (
  match_score_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(user_id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(job_id) ON DELETE CASCADE,
  overall_match_score numeric(5,2) NOT NULL DEFAULT 0,
  skill_alignment_score numeric(5,2) NOT NULL DEFAULT 0,
  technology_alignment_score numeric(5,2) NOT NULL DEFAULT 0,
  experience_alignment_score numeric(5,2) NOT NULL DEFAULT 0,
  career_readiness_score numeric(5,2) NOT NULL DEFAULT 0,
  calculated_date timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, job_id)
);
GRANT SELECT ON public.match_scores TO authenticated;
GRANT ALL ON public.match_scores TO service_role;
ALTER TABLE public.match_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Candidates read own scores" ON public.match_scores FOR SELECT TO authenticated USING (candidate_id = auth.uid());
CREATE POLICY "Job owners read scores" ON public.match_scores FOR SELECT TO authenticated USING (public.owns_job(job_id));
CREATE INDEX idx_match_candidate ON public.match_scores(candidate_id, overall_match_score DESC);
CREATE INDEX idx_match_job ON public.match_scores(job_id, overall_match_score DESC);