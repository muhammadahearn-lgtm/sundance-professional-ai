ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS equity_type text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS equity_range text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS equity_vesting text NOT NULL DEFAULT '';
ALTER TABLE public.jobs ADD CONSTRAINT jobs_equity_type_chk CHECK (equity_type IN ('none','rsu','stock_options','percentage'));
ALTER TABLE public.jobs ADD CONSTRAINT jobs_equity_len_chk CHECK (char_length(equity_range) <= 80 AND char_length(equity_vesting) <= 160);

CREATE TABLE public.job_screening_questions (
  question_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(job_id) ON DELETE CASCADE,
  question_text text NOT NULL CHECK (char_length(btrim(question_text)) BETWEEN 3 AND 300),
  question_type text NOT NULL DEFAULT 'yes_no' CHECK (question_type IN ('yes_no','choice','text')),
  options text[] NOT NULL DEFAULT '{}',
  ideal_answer text NOT NULL DEFAULT '',
  is_required boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_screening_questions TO authenticated;
GRANT ALL ON public.job_screening_questions TO service_role;
ALTER TABLE public.job_screening_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage screening questions" ON public.job_screening_questions FOR ALL TO authenticated
  USING (public.owns_job(job_id)) WITH CHECK (public.owns_job(job_id));
CREATE POLICY "Candidates read questions of active jobs" ON public.job_screening_questions FOR SELECT TO authenticated
  USING (public.job_is_active(job_id));

CREATE TABLE public.application_screening_answers (
  application_id uuid NOT NULL REFERENCES public.applications(application_id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.job_screening_questions(question_id) ON DELETE CASCADE,
  answer_text text NOT NULL CHECK (char_length(answer_text) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (application_id, question_id)
);
GRANT SELECT, INSERT ON public.application_screening_answers TO authenticated;
GRANT ALL ON public.application_screening_answers TO service_role;
ALTER TABLE public.application_screening_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Candidates insert own answers" ON public.application_screening_answers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.applications a JOIN public.job_screening_questions q ON q.job_id = a.job_id
    WHERE a.application_id = application_screening_answers.application_id AND q.question_id = application_screening_answers.question_id AND a.candidate_id = auth.uid()));
CREATE POLICY "Candidate or job owner reads answers" ON public.application_screening_answers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.applications a WHERE a.application_id = application_screening_answers.application_id
    AND (a.candidate_id = auth.uid() OR public.owns_job(a.job_id))));