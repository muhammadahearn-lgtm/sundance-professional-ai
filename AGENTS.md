<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Roles live in `user_roles` (one row per user, no client write access); profiles hold account data. Why: prevents users escalating or switching roles.
- `handle_new_user` signup trigger creates account + role. Why: role fixed at registration.
- Role areas (`/candidate/*`, `/recruiter/*`) sit under `_authenticated` and use `roleGuard` (src/lib/role-guard.ts) for cross-role blocking and onboarding redirects. Why: one gate per area.
- Onboarding completes only via `complete_onboarding` RPC. Why: checks profile exists.
- candidate/recruiter_profiles.user_id = candidate_id/recruiter_id everywhere. Why: no redesign.
- Taxonomy: languages fixed (no user entries); skills/technologies/soft skills added only via `add_taxonomy_entry` (dedupe by `normalized_name`, rejects names in the other skill/tech category); UI `CategoryGuardAdd` routes/AI-suggests category. Why: clean data.
- match_scores is written only by the server (service role); users can only read their own or their jobs' scores. Why: scores can't be faked.
- Company branding images live in the private `company-branding` bucket under `${uid}/…`; companies store storage paths and the UI shows signed URLs. Why: workspace blocks public buckets.
- Only a company's creator edits it; other recruiters see it read-only and the directory comes from the `company_recruiters` RPC. Why: recruiter_profiles stay private to their owner.
- Job requirements store `requirement_level` (required/preferred/optional) and keep `required_flag` in sync. Why: matching reads levels; legacy flag stays valid.
- Closed jobs are read-only, enforced by the `jobs_guard` trigger; jobs with applications can't be deleted. Why: keeps history.
- Job search filter/search state lives in the URL; only `job_status = active` jobs are queried and the 4-job compare limit is enforced by the `job_comparisons_limit` trigger. Why: shareable, unbypassable.
- Recruiters see a candidate only if searchable or an applicant to their job (`recruiter_can_view_candidate`); names come from the `candidate_names` RPC, never from profiles directly. Why: emails stay private.
- Moving a pipeline card updates the linked application status via `stageToStatus` (src/lib/talent-rules.ts); pipeline writes are guarded by the `pipeline_job_guard` trigger. Why: timeline mirrors pipeline; no cross-recruiter writes.
- Talent search filters client-side (`matchesTalent`), state in URL. Why: array fields filter poorly via API.
- Career intelligence (`career-engine`) and recommendations (`recommend-engine`) are pure client-side computations; only daily `career_snapshots` are stored. Why: explainable, unfakeable.
- Conversations are created only through the `start_conversation` RPC; archive/read/delivered go through RPCs, the inbox comes from `my_conversations`, and attachments live in the private `message-attachments` bucket under `<conversation_id>/`. Why: rules enforced in the database.
- Notifications are created only by DB triggers via `create_notification` (honors preferences, dedupes by `dedupe_key`); users only read/archive/delete their own. Why: unfakeable, no duplicates.
- Analytics are pure client-side helpers; only `analytics_events` (one view/click per item per day) is stored; recruiters see job views as counts via `my_job_view_counts`. Why: unfakeable; viewers private.
- Database helper functions are not callable by signed-out visitors, and trigger-only functions are not callable by anyone directly. Why: less exposure.
- Profile photos live in the private `avatars` bucket under `${uid}/`; profiles.avatar_path stores the path. Sign-up photos upload on first sign-in. Why: no session before confirmation.
- Soft skills (`soft_skills`, `candidate_soft_skills`, `job_soft_skills`) are display/search/filter only and must never feed match, career, recommendation or ranking scores. Why: product rule.
- Candidate links/projects: validate in `profile-links.ts`, render via `links-projects.tsx`. Why: one path.
- Salaries are stored as integer amounts + currency code; all validation/display goes through `src/lib/salary.ts`. Why: one format.
- Roles/levels are controlled lists; jobs store role_id+level_id+display-only custom_title; job_title derived via `displayJobTitle`. Why: custom titles never drive logic.
- Locations: country from `countries` list; state/city normalized by `location_normalize` trigger which also rebuilds `location` ("City, State, Country"); client mirror `src/lib/location.ts`. Why: consistent display/search.
- Education: fixed `degree_type` list (DB CHECK); field/institution normalized by `education_normalize`; client `src/lib/education.ts`; job `minimum_degree`/education fit never scored. Why: clean data.
- Only `moderators` (via `is_moderator`) review `reports` and restrict via `moderate_restrict`. Why: no self-granted review power.
- Certifications: `certification_normalize` links to `certification_catalog` by name/abbr/alias (`cert_key`, word-order-free); custom entries Title-Cased, candidate-only. Why: clean data.
