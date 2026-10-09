ALTER TABLE public.team_review_links
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'compare' CHECK (mode IN ('compare','profile')),
  ADD COLUMN IF NOT EXISTS verdict text CHECK (verdict IS NULL OR verdict IN ('strong_yes','yes','hold','pass')),
  ADD COLUMN IF NOT EXISTS feedback text NOT NULL DEFAULT '' CHECK (char_length(feedback) <= 1000),
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS note_id uuid,
  ADD COLUMN IF NOT EXISTS created_by uuid;