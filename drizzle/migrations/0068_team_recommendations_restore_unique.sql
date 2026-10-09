DROP INDEX IF EXISTS public.team_recommendations_one_per_pick;
ALTER TABLE public.team_recommendations ADD CONSTRAINT team_recommendations_job_id_stakeholder_id_key UNIQUE (job_id, stakeholder_id);