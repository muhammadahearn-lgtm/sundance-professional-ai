ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS career_mode text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS passive_min_salary integer;
ALTER TABLE public.candidate_profiles
  ADD CONSTRAINT candidate_profiles_career_mode_check CHECK (career_mode IN ('active','passive','not_looking')),
  ADD CONSTRAINT candidate_profiles_passive_min_salary_check CHECK (passive_min_salary IS NULL OR passive_min_salary >= 0);