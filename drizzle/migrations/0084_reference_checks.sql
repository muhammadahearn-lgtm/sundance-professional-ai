CREATE TABLE public.reference_requests (
  request_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(job_id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL,
  recruiter_id uuid NOT NULL,
  target_count int NOT NULL DEFAULT 2 CHECK (target_count BETWEEN 1 AND 3),
  message text NOT NULL DEFAULT '' CHECK (char_length(message) <= 500),
  status text NOT NULL DEFAULT 'awaiting_candidate' CHECK (status IN ('awaiting_candidate','in_progress','completed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX reference_requests_one_open ON public.reference_requests(job_id, candidate_id) WHERE status <> 'cancelled';
GRANT SELECT ON public.reference_requests TO authenticated;
GRANT ALL ON public.reference_requests TO service_role;
ALTER TABLE public.reference_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Job owner or candidate reads reference requests" ON public.reference_requests FOR SELECT TO authenticated
  USING (public.owns_job(job_id) OR candidate_id = auth.uid());

CREATE TABLE public.candidate_references (
  reference_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.reference_requests(request_id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(job_id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),
  relationship text NOT NULL CHECK (relationship IN ('manager','peer','direct_report','mentor','client')),
  company text NOT NULL DEFAULT '' CHECK (char_length(company) <= 160),
  worked_together text NOT NULL DEFAULT '' CHECK (char_length(worked_together) <= 120),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','completed')),
  confirmed_relationship boolean,
  rating int CHECK (rating BETWEEN 1 AND 5),
  strengths text CHECK (char_length(strengths) <= 1500),
  growth text CHECK (char_length(growth) <= 1500),
  rehire_comment text CHECK (char_length(rehire_comment) <= 1000),
  confidential_note text CHECK (char_length(confidential_note) <= 1000),
  submitted_at timestamptz,
  reminded_at timestamptz,
  note_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX candidate_references_request ON public.candidate_references(request_id);
GRANT SELECT ON public.candidate_references TO authenticated;
GRANT ALL ON public.candidate_references TO service_role;
ALTER TABLE public.candidate_references ENABLE ROW LEVEL SECURITY;
-- Only the job owner reads referee answers; candidates never read this table.
CREATE POLICY "Job owner reads references" ON public.candidate_references FOR SELECT TO authenticated
  USING (public.owns_job(job_id));

CREATE OR REPLACE FUNCTION public.notify_reference() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE jt text;
BEGIN
  SELECT job_title INTO jt FROM public.jobs WHERE job_id = NEW.job_id;
  IF TG_TABLE_NAME = 'reference_requests' THEN
    IF TG_OP = 'INSERT' THEN
      PERFORM public.create_notification(NEW.candidate_id, 'candidate', 'reference_request', 'application',
        'References requested', 'Add ' || NEW.target_count || ' professional reference' || CASE WHEN NEW.target_count > 1 THEN 's' ELSE '' END || ' for ' || coalesce(jt,'your application') || '.',
        '/candidate/applications', 'high', 'refreq-' || NEW.request_id);
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    PERFORM public.create_notification((SELECT recruiter_id FROM public.reference_requests WHERE request_id = NEW.request_id), 'recruiter', 'reference_completed', 'pipeline',
      'Reference received', NEW.name || ' completed a reference for ' || coalesce(jt,'your job') || '.',
      '/recruiter/candidates/' || NEW.candidate_id || '?job=' || NEW.job_id, 'normal', 'refdone-' || NEW.reference_id);
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_reference() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER reference_requests_notify AFTER INSERT ON public.reference_requests FOR EACH ROW EXECUTE FUNCTION public.notify_reference();
CREATE TRIGGER candidate_references_notify AFTER UPDATE ON public.candidate_references FOR EACH ROW EXECUTE FUNCTION public.notify_reference();