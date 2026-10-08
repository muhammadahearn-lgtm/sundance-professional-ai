# Sundance Standard Resume

## Recommendation

Build it. The feature solves a real problem: recruiters receive a consistent, readable document while candidates keep control of their original resume and profile data.

The main risks are manageable:
- **Bias and regional norms:** photos stay off by default. Candidates can opt in after a short fairness and regional-use note.
- **Out-of-date documents:** use published, numbered snapshots rather than silently changing a resume recruiters may already have downloaded.
- **Misleading claims:** include only candidate-confirmed profile data. Soft skills are candidate-selected, not AI-claimed, and never affect match or ranking scores.
- **Privacy:** only recruiters already permitted to view the candidate may download the selected resume. Personal email, salary expectations, and private settings stay out of the standard resume.
- **Length:** target two pages, but never remove meaningful experience solely to force two pages. Show a clear warning when content runs long.

## Candidate experience

### One unified Resume section
Replace the current single-file card with a simple resume workspace:

- **Original Resume** — upload, replace, download, scan for profile updates, or delete.
- **Sundance Standard Resume** — Premium Preview badge, current published version, last-published date, Preview, Edit, Publish New Version, and Download PDF.
- **Recruiter Download Choice** — a two-option selector:
  - Original resume
  - Sundance Standard Resume

If the chosen version becomes unavailable, the app explains the issue and safely falls back to the available version rather than showing a broken download.

### Standard resume editor and preview
Use a focused editor with a live document preview, similar to the existing recruiter-profile preview. The candidate can:

- include or hide their photo; default is hidden;
- choose which profile sections appear;
- reorder optional sections;
- select up to five soft skills already confirmed on their profile;
- add and manage spoken languages with proficiency;
- review missing or incomplete profile data before publishing;
- preview the exact document recruiters will receive;
- publish a numbered snapshot only after confirmation.

The preview should use a restrained, ATS-friendly Sundance layout: white document, dark navy text, blue section accents, strong spacing, one readable column, selectable text, no decorative charts, and no match score.

### Resume content standard
1. Name and professional headline
2. Location and approved professional links
3. Optional photo
4. Professional summary
5. Work experience and achievements
6. Technical skills
7. Tools and technologies
8. Programming languages
9. Candidate-selected soft skills
10. Education
11. Certifications
12. Spoken languages and proficiency
13. Optional projects

Exclude personal email, full street address, salary expectations, availability, age/birth date, match score, and other sensitive or hiring-decision metadata.

## Recruiter experience

On the candidate profile, replace the single download action with one clear button showing the candidate’s choice, for example **Download Sundance Resume** or **Download Original Resume**. Add a small secondary menu only when both versions are available, so a recruiter can view the other candidate-approved version without cluttering the page.

The standard resume preview opens in-app; the PDF download uses the exact published snapshot. Recruiters never see drafts or unpublished edits.

## Spoken languages

Add a dedicated **Spoken Languages** profile section, separate from programming languages. It uses the platform’s consistent search-or-add pattern and records proficiency such as Native/Bilingual, Fluent, Professional, Conversational, or Basic. Spoken languages appear on the profile and standard resume but do not affect match, career, recommendation, or ranking scores.

## Early-access premium behavior

Launch this as **Premium Preview — free during early access**. Everyone can use it now, matching the current pricing promise. Keep the access decision behind one entitlement helper so paid gating can be enabled later without redesigning the resume flow or deleting existing versions.

## Technical details

- Add candidate-owned spoken-language records with authenticated owner write access and authorized recruiter read access.
- Add versioned standard-resume records containing an immutable structured snapshot, version number, publication time, photo choice, section configuration, and private PDF storage path.
- Add a candidate setting for the recruiter download preference (`original` or `standard`).
- Extend private resume storage rules so candidates manage their own files and only recruiters satisfying the existing candidate-visibility rule can read the chosen resume. This also aligns the current download button with recruiter search visibility.
- Generate an accessible, text-based PDF from the reviewed snapshot using a browser/edge-compatible PDF library; upload it privately only when the candidate publishes.
- Keep drafts local until publication; published versions remain immutable and older versions remain available to the candidate for history and rollback.
- Use the existing profile, taxonomy, resume-upload, signed-download, and recruiter-visibility patterns rather than creating a second profile source of truth.
- Update the privacy copy to describe generated resume versions, recruiter download choice, photo control, and spoken languages.
- Record the snapshot/access architecture in `AGENTS.md` and the selected product rules in project memory.

## Validation

- Add focused tests for photo-off default, immutable version numbering, recruiter download preference/fallback, premium-preview access, five-soft-skill limit, and the rule that spoken/soft skills never enter scoring.
- Test candidate create/preview/publish/select/download flows and recruiter preview/download flows with authenticated candidate and recruiter accounts.
- Visually inspect generated one-page, two-page, long-content, no-photo, photo-enabled, and non-English-character PDFs.
- Verify phone and desktop layouts, keyboard access, long names, empty sections, download failures, and private-access denial.
