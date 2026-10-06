ALTER TABLE public.interviews ADD COLUMN round_number integer NOT NULL DEFAULT 1;

CREATE TABLE public.interview_scorecards (
  interview_id uuid PRIMARY KEY REFERENCES public.interviews(interview_id) ON DELETE CASCADE,
  recruiter_id uuid NOT NULL,
  recommendation text NOT NULL CHECK (recommendation IN ('strong_hire','hire','leaning_no','strong_no')),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  strengths text NOT NULL DEFAULT '',
  concerns text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_scorecards TO authenticated;
GRANT ALL ON public.interview_scorecards TO service_role;
ALTER TABLE public.interview_scorecards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recruiters manage own scorecards" ON public.interview_scorecards FOR ALL TO authenticated
  USING (recruiter_id = auth.uid())
  WITH CHECK (recruiter_id = auth.uid() AND EXISTS (SELECT 1 FROM public.interviews i WHERE i.interview_id = interview_scorecards.interview_id AND i.recruiter_id = auth.uid()));
CREATE TRIGGER interview_scorecards_updated BEFORE UPDATE ON public.interview_scorecards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.interviews_validate()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.format = 'online' AND NEW.meeting_url !~* '^https://' THEN RAISE EXCEPTION 'Please add a meeting link starting with https://'; END IF;
  IF NEW.format = 'in_person' AND length(trim(NEW.location_address)) < 5 THEN RAISE EXCEPTION 'Please add the interview address'; END IF;
  IF NEW.duration_minutes < 10 OR NEW.duration_minutes > 480 THEN RAISE EXCEPTION 'Duration must be between 10 and 480 minutes'; END IF;
  IF NEW.round_number < 1 OR NEW.round_number > 10 THEN RAISE EXCEPTION 'Round must be between 1 and 10'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $function$;