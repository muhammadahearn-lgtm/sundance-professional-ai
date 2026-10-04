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
