CREATE TABLE public.job_stakeholders (
  stakeholder_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(job_id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
  hiring_role text NOT NULL DEFAULT 'Hiring Manager' CHECK (char_length(hiring_role) <= 60),
  email text NOT NULL CHECK (char_length(email) <= 255 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  notify_on_interview boolean NOT NULL DEFAULT true,
  notify_on_shortlist boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_stakeholders TO authenticated;
GRANT ALL ON public.job_stakeholders TO service_role;
ALTER TABLE public.job_stakeholders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Job owner manages stakeholders" ON public.job_stakeholders
  FOR ALL TO authenticated
  USING (public.owns_job(job_id))
  WITH CHECK (public.owns_job(job_id));