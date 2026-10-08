## src/components/profile rules
- Candidate and recruiter profile pages group sections into tabs via `ProfileTabs.tsx`; tab mirrored to `?tab=`. Why: no long scroll, deep-linkable.
- Candidate visibility (talent search + hide-from-employer) is edited only in Settings via exported `VisibilityControls`; the profile Resume tab shows a status chip linking there. Why: privacy lives with account settings.
