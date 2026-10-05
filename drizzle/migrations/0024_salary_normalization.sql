ALTER TABLE public.candidate_profiles ADD COLUMN IF NOT EXISTS salary_amount integer;
ALTER TABLE public.candidate_profiles ADD COLUMN IF NOT EXISTS salary_currency text NOT NULL DEFAULT 'USD';

UPDATE public.candidate_profiles cp SET salary_amount = sub.n
FROM (
  SELECT user_id,
    CASE WHEN m IS NULL THEN NULL ELSE
      (CASE WHEN (m[1]::numeric * CASE WHEN m[2] IS NOT NULL THEN 1000 ELSE 1 END) < 1000
        THEN m[1]::numeric * 1000 ELSE m[1]::numeric * CASE WHEN m[2] IS NOT NULL THEN 1000 ELSE 1 END END)::integer END AS n
  FROM (SELECT user_id, regexp_match(replace(salary_expectation, ',', ''), '(\d+(?:\.\d+)?)\s*([kK])?') AS m FROM public.candidate_profiles) s
) sub
WHERE cp.user_id = sub.user_id AND cp.salary_amount IS NULL;

ALTER TABLE public.candidate_profiles ADD CONSTRAINT candidate_salary_amount_range CHECK (salary_amount IS NULL OR (salary_amount >= 0 AND salary_amount <= 1000000000000));
ALTER TABLE public.candidate_profiles ADD CONSTRAINT candidate_salary_currency_code CHECK (salary_currency ~ '^[A-Z]{3}$');
ALTER TABLE public.jobs ADD CONSTRAINT jobs_salary_currency_code CHECK (salary_currency ~ '^[A-Z]{3}$') NOT VALID;

COMMENT ON COLUMN public.candidate_profiles.salary_expectation IS 'DEPRECATED: replaced by salary_amount + salary_currency';