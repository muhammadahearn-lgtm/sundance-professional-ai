# Company Teams: Multiple Admins per Company

## Goal
Let a company have several admins instead of a single creator. Recruiters who work for the same company can request admin access, and existing admins approve or deny. When a recruiter moves companies, they edit their profile, pick the new company, and their admin rights follow the company — not the person.

## What users will see

### Company Profile page (recruiter)
- New **Team** section on the Company Profile page listing every recruiter linked to the company, with an **Admin** or **Member** badge.
- Admins see: **Make admin / Remove admin** actions next to each member, and a **Requests** inbox showing pending admin requests with **Approve / Deny**.
- Non-admin members see the team list read-only plus a **Request admin access** button (disabled while a request is pending).
- The company creator automatically becomes the first admin; existing companies keep working with no action needed.

### Recruiter Profile page
- When editing company name, the recruiter picks from the governed company list (search or add new, same as Job Wizard). Switching companies removes their admin rights at the old company and links them as a plain member of the new one.

### Safety rules
- **Last-admin protection:** the sole admin of a company cannot remove themselves or switch away without promoting another member first (clear inline message explaining why).
- Admin rights never transfer between companies — moving means starting as a member at the new company.
- Only admins can edit the company profile, branding, and contact email (same as today, but now any admin, not just the creator).

## Technical details

### Database (one migration)
- New table `company_members`:
  - `company_id` → companies, `user_id` → recruiter, `role` (`admin` | `member`), timestamps, unique (company_id, user_id).
  - GRANTs for `authenticated` + `service_role`, RLS enabled.
  - Policies: recruiters read members of their own company; only admins insert/update/delete member rows (via a `is_company_admin(_company, _uid)` SECURITY DEFINER function).
- New table `company_admin_requests`:
  - `company_id`, `user_id`, `status` (`pending`/`approved`/`denied`), timestamps, one pending request per user per company.
  - RLS: member reads/creates own request; admins read/update requests for their company.
- Backfill: every existing company gets its `created_by` recruiter inserted as `admin` in `company_members`.
- `is_company_admin()` helper used by RLS on `companies` updates (replacing the `created_by = auth.uid()` check) and by the UI.
- Trigger: approving a request inserts the member as `admin` and marks the request approved; notification sent to the requester via `create_notification`.
- Trigger: when a recruiter's `recruiter_profiles.company_id` changes, their old membership is removed and a `member` row is created for the new company (blocked if they are the last admin — enforced in the app flow with a clear error).

### App code
- `src/lib/company-team.ts` — pure helpers: last-admin check, request state, role labels (with unit tests next to existing lib tests).
- `src/components/recruiter/CompanyProfilePage.tsx` — add the Team section, admin actions, and Requests inbox; swap `canEdit = created_by === uid` for an `is_company_admin` check.
- `src/components/recruiter/RecruiterProfilePage.tsx` — company field becomes the searchable company picker (reuse `SearchPicker` + `add_company_entry`); on switch, warn if they are the last admin.
- Notifications: requester notified on approve/deny; admins notified when a new request arrives (uses existing trigger-based notification system).

## Verification
- Unit tests for last-admin rule, request approve/deny transitions, and membership switching.
- Typecheck + build clean.
- Browser walkthrough as a recruiter: view team, request admin as a second account, approve as admin, confirm both admins can edit; attempt last-admin self-removal and confirm it is blocked.

## Out of scope (for later)
- Inviting recruiters by email who have not signed up yet.
- Removing a member from a company entirely (kicking someone out).
