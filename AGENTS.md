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
- Accounts + roles are created by the `handle_new_user` signup trigger from signup metadata. Why: role is fixed at registration.
- Role areas (`/candidate/*`, `/recruiter/*`) sit under `_authenticated` and use `roleGuard` (src/lib/role-guard.ts) for cross-role blocking and onboarding redirects. Why: one gate per area.
- Onboarding completion goes only through the `complete_onboarding` RPC. Why: it checks the role's profile exists first.
- candidate_profiles.user_id and recruiter_profiles.user_id serve as candidate_id / recruiter_id in all related tables. Why: reuses Stage 2 profiles without a redesign.
- Taxonomy lookups (roles, programming_languages, technical_skills, technologies) are the single source for matching/search; readable by everyone, written only by admins. Why: consistent search and match data.
- match_scores is written only by the server (service role); users can only read their own or their jobs' scores. Why: scores can't be faked.
- Company branding images live in the private `company-branding` bucket under `${uid}/…`; companies store storage paths and the UI shows signed URLs. Why: workspace blocks public buckets.
- Only a company's creator edits it; other recruiters see it read-only and the directory comes from the `company_recruiters` RPC. Why: recruiter_profiles stay private to their owner.
- Job requirements store `requirement_level` (required/preferred/optional) and keep `required_flag` in sync. Why: matching reads levels; legacy flag stays valid.
- Closed jobs are read-only, enforced by the `jobs_guard` trigger; jobs with applications can't be deleted. Why: preserves application history.
- Job search filter/search state lives in the URL; only `job_status = active` jobs are queried and the 4-job compare limit is enforced by the `job_comparisons_limit` trigger. Why: shareable searches and limits users cannot bypass.
- Recruiters see a candidate only if searchable or an applicant to their job (`recruiter_can_view_candidate`); names come from the `candidate_names` RPC, never from profiles directly. Why: profiles (emails) stay private.
- Moving a pipeline card updates the linked application status via `stageToStatus` (src/lib/talent-rules.ts); pipeline writes are guarded by the `pipeline_job_guard` trigger. Why: candidate timeline mirrors recruiter progress, recruiters can't touch others' jobs.
- Talent search loads searchable candidates once and filters client-side (`matchesTalent`); filter state lives in the URL. Why: free-text salary and array fields don't filter well in the API at this scale.
- Career intelligence is computed client-side by the pure `career-engine` from profile, taxonomy, active jobs and match_scores; only daily `career_snapshots` (candidate-owned) are stored for trend history. Why: deterministic, explainable output and no fakeable shared data.
- Recommendations are computed client-side by the pure `recommend-engine` on top of match_scores and the career report; nothing new is stored. Why: explainable, deterministic and unfakeable, with no extra tables.
- Conversations start only via the `start_conversation` RPC; archive/read/delivered go through RPCs, the inbox comes from `my_conversations`, attachments live in private `message-attachments` under `<conversation_id>/`. Why: messaging rules enforced in the database.
- Notifications are created only by database triggers through `create_notification` (respects `notification_preferences`, dedupes via `dedupe_key`; unread message notifications group per conversation); users can only read, mark read/archive or delete their own. Why: notifications can't be faked and never duplicate.
- Analytics are computed client-side by pure `analytics` helpers; only `analytics_events` (own views/clicks, one per item per day) is stored and recruiters see job views only as counts via `my_job_view_counts`. Why: no fakeable metrics, viewers stay private.
- Database helper functions are not callable by signed-out visitors, and trigger-only functions are not callable by anyone directly. Why: smaller attack surface.
- Profile photos live in the private `avatars` bucket under `${uid}/`; profiles.avatar_path stores the path. A photo picked at sign-up stays in the browser and uploads on first sign-in (no session exists before email confirmation). Why: upload needs a signed-in user.
- Evaluation-only data — soft skills (`soft_skills`, `candidate_soft_skills`, `job_soft_skills`), candidate links on candidate_profiles (validated by src/lib/profile-links.ts) and `candidate_projects` — is display/search only and never feeds match, career, recommendation or ranking scores. Why: product rule.
