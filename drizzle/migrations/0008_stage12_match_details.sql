ALTER TABLE public.match_scores
  ADD COLUMN IF NOT EXISTS language_alignment_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preference_alignment_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN public.match_scores.career_readiness_score IS 'Mirrors preference_alignment_score until Stage 13 career readiness';