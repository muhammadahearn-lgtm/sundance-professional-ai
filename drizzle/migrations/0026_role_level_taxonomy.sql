ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '';
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
CREATE UNIQUE INDEX IF NOT EXISTS roles_role_name_key2 ON public.roles (role_name);

CREATE TABLE public.levels (
  level_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.levels TO anon, authenticated;
GRANT ALL ON public.levels TO service_role;
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Levels are readable" ON public.levels FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS level_id uuid REFERENCES public.levels(level_id);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS custom_title text NOT NULL DEFAULT '';
ALTER TABLE public.candidate_profiles ADD COLUMN IF NOT EXISTS current_level_id uuid REFERENCES public.levels(level_id);
ALTER TABLE public.candidate_profiles ADD COLUMN IF NOT EXISTS target_role_id uuid REFERENCES public.roles(role_id);
ALTER TABLE public.candidate_profiles ADD COLUMN IF NOT EXISTS target_level_id uuid REFERENCES public.levels(level_id);
CREATE INDEX IF NOT EXISTS jobs_level_idx ON public.jobs(level_id);
CREATE INDEX IF NOT EXISTS cp_role_idx ON public.candidate_profiles(role_id);
CREATE INDEX IF NOT EXISTS cp_level_idx ON public.candidate_profiles(current_level_id);
COMMENT ON COLUMN public.jobs.experience_level IS 'DEPRECATED: mirrors levels.level_name via level_id';