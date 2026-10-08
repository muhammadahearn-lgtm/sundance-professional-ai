import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, Mail, legalHead, type LegalSection } from "@/components/site/LegalPage";

export const Route = createFileRoute("/privacy")({
  staticData: { sitemap: true },
  head: () => legalHead("Privacy Policy — Sundance Professionals", "How Sundance Professionals collects, uses, protects and deletes candidate and recruiter information.", "/privacy"),
  component: Privacy,
});

const sections: LegalSection[] = [
  { id: "overview", title: "Overview", body: <p>This policy explains what information Sundance Professionals collects when you use our hiring platform as a candidate or recruiter, how we use it, who can see it, and the choices you have.</p> },
  { id: "collect", title: "Information We Collect", body: <>
    <ul>
      <li><strong>Account details:</strong> name, email address, password (stored securely, never visible to us), and account type.</li>
      <li><strong>Candidate profiles:</strong> headline, location, roles, skills, programming and spoken languages, technologies, soft skills, experience, education, certifications, salary expectations, availability, links, projects, resume and optional photo.</li>
      <li><strong>Recruiter and company profiles:</strong> job title, company details, logo, banner, optional company contact email and job postings.</li>
      <li><strong>Activity:</strong> applications, saved jobs and candidates, pipeline stages, messages, reports, notifications and basic usage events such as profile or job views.</li>
    </ul>
  </> },
  { id: "use", title: "How We Use Information", body: <ul>
    <li>To run the platform: profiles, job search, applications, messaging and notifications.</li>
    <li>To calculate match scores and career insights.</li>
    <li>To keep the community safe, review reports and prevent abuse.</li>
    <li>To improve the product using aggregated usage information.</li>
    <li>We do not sell your personal information.</li>
  </ul> },
  { id: "matching", title: "Matching & Automated Insights", body: <>
    <p>Match scores are calculated automatically from five areas: programming languages, technical skills, tools & technologies, experience, and preferences (work arrangement, location, role, availability and salary when currencies match).</p>
    <p>Your <strong>photo, education, soft skills, certifications, links and projects are never used in the score</strong>. They are shown for context only. Scores are guidance; hiring decisions are made by people.</p>
  </> },
  { id: "visibility", title: "Who Can See Your Information", body: <ul>
    <li><strong>Personal emails stay private.</strong> Candidates and recruiters contact each other through in-app messaging.</li>
    <li>Recruiters can see a candidate profile only when the candidate is searchable or has applied to that recruiter's job.</li>
    <li>Candidates can see active job postings and company profiles, including an optional company contact email.</li>
    <li>Messages are visible only to the people in the conversation, and to moderators when reviewing a report about it.</li>
    <li>Reports are private between the reporter and moderators.</li>
  </ul> },
  { id: "storage", title: "Storage & Security", body: <p>Photos, resumes, company images and message attachments are stored in private storage and shared only through short-lived secure links. Access rules are enforced on our servers, not just in the app. No system is perfectly secure, so please use a strong, unique password.</p> },
  { id: "standard-resume", title: "Sundance Standard Resumes", body: <>
    <p>Candidates may generate a standardized resume from profile information they have confirmed. Published versions are preserved as numbered snapshots so later profile edits do not silently change a document a recruiter received.</p>
    <p>Candidates choose whether recruiters receive their original upload or their latest Sundance Standard Resume. Including a profile photo is optional and off by default. Standard resumes exclude personal email, salary expectations, availability and match scores.</p>
  </> },
  { id: "rights", title: "Your Choices & Rights", body: <ul>
    <li>Edit or remove profile information at any time.</li>
    <li>Turn off talent-search visibility as a candidate.</li>
    <li>Choose which notifications you receive in Settings.</li>
    <li>Permanently delete your account in Settings. This removes your profile, files and related data. Conversations you took part in are removed for both sides.</li>
    <li>Request a copy of your information by contacting us.</li>
  </ul> },
  { id: "retention", title: "Data Retention", body: <p>We keep your information while your account is active. When you delete your account, we remove it from the live platform promptly; limited records may remain in secure backups for a short period or where required by law.</p> },
  { id: "children", title: "Children", body: <p>Sundance Professionals is intended for professionals aged 18 and over. We do not knowingly collect information from children.</p> },
  { id: "changes", title: "Changes To This Policy", body: <p>We may update this policy as the platform grows. We will update the date above and notify you of significant changes.</p> },
  { id: "contact", title: "Contact Us", body: <p>Questions about privacy? Email <Mail />.</p> },
];

function Privacy() {
  return <LegalPage eyebrow="Legal" title="Privacy Policy" desc="How we collect, use and protect your information on Sundance Professionals." sections={sections} />;
}
