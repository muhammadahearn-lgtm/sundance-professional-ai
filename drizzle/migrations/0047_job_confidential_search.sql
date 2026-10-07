ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS is_confidential boolean NOT NULL DEFAULT false;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS confidential_label text NOT NULL DEFAULT '';
ALTER TABLE public.jobs ADD CONSTRAINT jobs_confidential_label_len CHECK (char_length(confidential_label) <= 80);