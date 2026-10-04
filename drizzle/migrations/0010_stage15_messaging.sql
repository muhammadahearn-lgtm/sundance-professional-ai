CREATE TYPE public.conversation_status AS ENUM ('active','archived','closed');
CREATE TYPE public.sender_type AS ENUM ('candidate','recruiter');
CREATE TYPE public.message_status AS ENUM ('sent','delivered','read');

CREATE TABLE public.conversations (
  conversation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(user_id) ON DELETE CASCADE,
  recruiter_id uuid NOT NULL REFERENCES public.recruiter_profiles(user_id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(job_id) ON DELETE SET NULL,
  application_id uuid REFERENCES public.applications(application_id) ON DELETE SET NULL,
  conversation_status public.conversation_status NOT NULL DEFAULT 'active',
  candidate_archived boolean NOT NULL DEFAULT false,
  recruiter_archived boolean NOT NULL DEFAULT false,
  last_message_at timestamptz,
  last_message_preview text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX conversations_unique ON public.conversations (candidate_id, recruiter_id, job_id) NULLS NOT DISTINCT;
GRANT SELECT ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.messages (
  message_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(conversation_id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_type public.sender_type NOT NULL,
  message_body text NOT NULL DEFAULT '',
  message_status public.message_status NOT NULL DEFAULT 'sent',
  attachment_path text,
  attachment_name text,
  attachment_size integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT messages_body_len CHECK (char_length(message_body) <= 5000),
  CONSTRAINT messages_not_empty CHECK (char_length(btrim(message_body)) > 0 OR attachment_path IS NOT NULL)
);
CREATE INDEX messages_conv_idx ON public.messages (conversation_id, created_at);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conv uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversations WHERE conversation_id = _conv AND (candidate_id = auth.uid() OR recruiter_id = auth.uid()))
$$;

CREATE POLICY "Participants read conversations" ON public.conversations FOR SELECT TO authenticated
  USING (candidate_id = auth.uid() OR recruiter_id = auth.uid());
CREATE POLICY "Participants read messages" ON public.messages FOR SELECT TO authenticated
  USING (public.is_conversation_participant(conversation_id));
CREATE POLICY "Participants send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_conversation_participant(conversation_id));

-- Fill sender type, force initial status, block closed threads, update conversation summary.
CREATE OR REPLACE FUNCTION public.messages_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.conversations;
BEGIN
  SELECT * INTO c FROM public.conversations WHERE conversation_id = NEW.conversation_id;
  IF c.conversation_status = 'closed' THEN RAISE EXCEPTION 'Conversation is closed'; END IF;
  NEW.sender_type := CASE WHEN NEW.sender_id = c.candidate_id THEN 'candidate'::public.sender_type ELSE 'recruiter'::public.sender_type END;
  NEW.message_status := 'sent';
  NEW.created_at := now();
  UPDATE public.conversations SET last_message_at = now(), updated_at = now(),
    last_message_preview = left(COALESCE(NULLIF(btrim(NEW.message_body), ''), '📎 ' || COALESCE(NEW.attachment_name, 'Attachment')), 160),
    candidate_archived = false, recruiter_archived = false,
    conversation_status = CASE WHEN conversation_status = 'archived' THEN 'active' ELSE conversation_status END
  WHERE conversation_id = NEW.conversation_id;
  RETURN NEW;
END $$;
CREATE TRIGGER messages_before_insert BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.messages_before_insert();

-- Start (or reuse) a conversation. Recruiters: any candidate they can view, optional own job.
-- Candidates: only for a job they applied to, with that job's recruiter.
CREATE OR REPLACE FUNCTION public.start_conversation(_candidate uuid, _job uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); rec uuid; cand uuid; app uuid; cid uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Session expired'; END IF;
  IF public.has_role(me, 'recruiter') THEN
    IF NOT public.recruiter_can_view_candidate(_candidate) THEN RAISE EXCEPTION 'Access denied'; END IF;
    IF _job IS NOT NULL AND NOT public.owns_job(_job) THEN RAISE EXCEPTION 'Access denied'; END IF;
    rec := me; cand := _candidate;
  ELSIF public.has_role(me, 'candidate') THEN
    IF _job IS NULL THEN RAISE EXCEPTION 'Access denied'; END IF;
    SELECT recruiter_id INTO rec FROM public.jobs WHERE job_id = _job;
    cand := me;
    IF rec IS NULL OR NOT EXISTS (SELECT 1 FROM public.applications WHERE candidate_id = me AND job_id = _job) THEN
      IF NOT EXISTS (SELECT 1 FROM public.conversations WHERE candidate_id = me AND job_id = _job) THEN RAISE EXCEPTION 'Access denied'; END IF;
    END IF;
  ELSE RAISE EXCEPTION 'Access denied';
  END IF;
  SELECT conversation_id INTO cid FROM public.conversations WHERE candidate_id = cand AND recruiter_id = rec AND job_id IS NOT DISTINCT FROM _job;
  IF cid IS NOT NULL THEN RETURN cid; END IF;
  IF _job IS NOT NULL THEN SELECT application_id INTO app FROM public.applications WHERE candidate_id = cand AND job_id = _job; END IF;
  INSERT INTO public.conversations (candidate_id, recruiter_id, job_id, application_id) VALUES (cand, rec, _job, app) RETURNING conversation_id INTO cid;
  RETURN cid;
END $$;

CREATE OR REPLACE FUNCTION public.set_conversation_archived(_conv uuid, _archived boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET
    candidate_archived = CASE WHEN candidate_id = auth.uid() THEN _archived ELSE candidate_archived END,
    recruiter_archived = CASE WHEN recruiter_id = auth.uid() THEN _archived ELSE recruiter_archived END,
    updated_at = now()
  WHERE conversation_id = _conv AND (candidate_id = auth.uid() OR recruiter_id = auth.uid());
  IF NOT FOUND THEN RAISE EXCEPTION 'Conversation not found'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.mark_messages_delivered()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.messages m SET message_status = 'delivered'
  WHERE m.message_status = 'sent' AND m.sender_id <> auth.uid() AND public.is_conversation_participant(m.conversation_id)
$$;

CREATE OR REPLACE FUNCTION public.mark_conversation_read(_conv uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.messages SET message_status = 'read'
  WHERE conversation_id = _conv AND sender_id <> auth.uid() AND message_status <> 'read' AND public.is_conversation_participant(_conv)
$$;

-- Inbox rows with hiring context; names only for the caller's own conversations.
CREATE OR REPLACE FUNCTION public.my_conversations()
RETURNS TABLE(conversation_id uuid, candidate_id uuid, recruiter_id uuid, job_id uuid, application_id uuid, conversation_status public.conversation_status,
  archived boolean, last_message_at timestamptz, last_message_preview text, created_at timestamptz,
  candidate_name text, recruiter_name text, company_name text, job_title text, application_status public.application_status, pipeline_stage public.pipeline_stage, unread integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.conversation_id, c.candidate_id, c.recruiter_id, c.job_id, c.application_id, c.conversation_status,
    CASE WHEN c.candidate_id = auth.uid() THEN c.candidate_archived ELSE c.recruiter_archived END,
    c.last_message_at, c.last_message_preview, c.created_at,
    btrim(cp.first_name || ' ' || cp.last_name), btrim(rp.first_name || ' ' || rp.last_name),
    COALESCE(co.company_name, r.company_name, ''), j.job_title,
    COALESCE(a.application_status, a2.application_status),
    (SELECT p.current_stage FROM public.recruiting_pipeline p WHERE p.recruiter_id = c.recruiter_id AND p.candidate_id = c.candidate_id AND p.job_id IS NOT DISTINCT FROM c.job_id LIMIT 1),
    (SELECT count(*)::int FROM public.messages m WHERE m.conversation_id = c.conversation_id AND m.sender_id <> auth.uid() AND m.message_status <> 'read')
  FROM public.conversations c
  JOIN public.profiles cp ON cp.user_id = c.candidate_id
  JOIN public.profiles rp ON rp.user_id = c.recruiter_id
  LEFT JOIN public.recruiter_profiles r ON r.user_id = c.recruiter_id
  LEFT JOIN public.jobs j ON j.job_id = c.job_id
  LEFT JOIN public.companies co ON co.company_id = COALESCE(j.company_id, r.company_id)
  LEFT JOIN public.applications a ON a.application_id = c.application_id
  LEFT JOIN public.applications a2 ON c.application_id IS NULL AND a2.candidate_id = c.candidate_id AND a2.job_id = c.job_id
  WHERE c.candidate_id = auth.uid() OR c.recruiter_id = auth.uid()
  ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
$$;

CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Attachments: path = <conversation_id>/<file>
CREATE POLICY "Participants read message attachments" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'message-attachments' AND public.is_conversation_participant(((storage.foldername(name))[1])::uuid));
CREATE POLICY "Participants upload message attachments" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'message-attachments' AND public.is_conversation_participant(((storage.foldername(name))[1])::uuid));

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;