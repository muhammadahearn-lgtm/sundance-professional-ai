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
- Roles live in `user_roles` (one row per user, no client write access); profiles hold account data. Why: no role escalation.
- `handle_new_user` signup trigger creates account + role. Why: role fixed at registration.
- Role areas (`/candidate/*`, `/recruiter/*`) sit under `_authenticated` and use `roleGuard` (src/lib/role-guard.ts) for cross-role blocking and onboarding redirects. Why: one gate per area.
- Onboarding completes only via `complete_onboarding` RPC. Why: checks profile exists.
- candidate/recruiter_profiles.user_id = candidate_id/recruiter_id everywhere. Why: no redesign.
- Taxonomy: languages fixed; others added only via `add_taxonomy_entry` (dedupe, cross-category lock); `CategoryGuardAdd` resolves aliases/typos and AI-checks spelling. Why: clean data.
- match_scores is written only by the server (service role); users can only read their own or their jobs' scores. Why: scores can't be faked.
- Company branding images live in the private `company-branding` bucket under `${uid}/…`; companies store storage paths and the UI shows signed URLs. Why: workspace blocks public buckets.
- Company editing needs `is_company_admin` (`company_members`). Requests via `company_admin_requests` (approve promotes; last admin protected). Team via `company_team`; admin dashboard reads counts-only `company_admin_jobs`. Why: no orphaned companies.
- Job requirements store `requirement_level` (required/preferred/optional) and keep `required_flag` in sync. Why: matching reads levels; legacy flag stays valid.
- Closed jobs are read-only (`jobs_guard`) but owners can re-open them; hired cards unlock only while open. Jobs with applications can't be deleted. Why: history kept, reneges recoverable.
- Job search filter/search state lives in the URL; only `job_status = active` jobs are queried and the 4-job compare limit is enforced by the `job_comparisons_limit` trigger. Why: shareable, unbypassable.
- Recruiters see a candidate only if searchable or an applicant to their job (`recruiter_can_view_candidate`); names come from the `candidate_names` RPC, never from profiles directly. Why: emails stay private.
- Pipeline moves sync application status via `stageToStatus`; writes guarded by `pipeline_job_guard`. Why: timeline mirrors pipeline.
- Conversations: created/archived/read only via RPCs (`start_conversation`, `my_conversations`); attachments in private `message-attachments/<conversation_id>/`. Why: DB-enforced.
- Notifications are created only by DB triggers via `create_notification` (honors preferences, dedupes by `dedupe_key`); users only read/archive/delete their own. Why: unfakeable, no duplicates.
- DB helper functions are not callable by signed-out visitors; trigger-only functions by no one. Why: less exposure.
- Profile photos live in the private `avatars` bucket under `${uid}/`; profiles.avatar_path stores the path. Sign-up photos upload on first sign-in. Why: no session before confirmation.
- Soft skills (`soft_skills`, `candidate_soft_skills`, `job_soft_skills`) are display/search/filter only and must never feed match, career, recommendation or ranking scores. Why: product rule.
- Roles/levels are controlled lists; new roles only via `add_role_entry` (strips seniority words, dedupes by taxonomy_key); jobs store role_id+level_id+display-only custom_title; job_title derived via `displayJobTitle`. Why: custom titles never drive logic, no duplicate roles.
- Locations: `countries` list; `location_normalize` trigger rebuilds `location`; client mirror `location.ts`. Why: consistent search.
- Education: fixed `degree_type` list (DB CHECK); field/institution normalized by `education_normalize`; client `src/lib/education.ts`; job `minimum_degree`/education fit never scored. Why: clean data.
- Only `moderators` (via `is_moderator`) review `reports` and restrict via `moderate_restrict`. Why: no self-granted review power.
- Certifications: `certification_normalize` links to `certification_catalog` via `cert_key`; custom entries candidate-only. Why: clean data.
- Job companies: pick via `my_job_companies` or add via `add_company_entry` (dedupe by `company_key`); creator edits unclaimed clients. Why: no duplicates.
- App navigation: sidebar lists workspaces only; sibling list pages share one entry and show tabs from `WORKSPACES` in AppShell; account links live in the sidebar footer. Why: fewer menu items, URLs unchanged.
- Seeded company catalog rows have `is_catalog = true`, a nil-UUID creator and no members, so they are readable by all signed-in users, selectable for jobs, and editable by no one. Why: shared reference list without ownership.
- Recruiter resume downloads require `resume_access_reason` and are logged by `log_resume_download`; requests use RPCs only. Why: candidate controls and sees downloads.
