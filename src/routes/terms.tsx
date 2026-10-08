import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, Mail, legalHead, type LegalSection } from "@/components/site/LegalPage";

export const Route = createFileRoute("/terms")({
  staticData: { sitemap: true },
  head: () => legalHead("Terms Of Service — Sundance Professionals", "The rules for candidates and recruiters using the Sundance Professionals hiring platform.", "/terms"),
  component: Terms,
});

const sections: LegalSection[] = [
  { id: "agreement", title: "Agreement", body: <p>By creating an account or using Sundance Professionals, you agree to these Terms, our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link> and our <Link to="/community-guidelines" className="text-primary hover:underline">Community Guidelines</Link>. If you do not agree, please do not use the platform.</p> },
  { id: "early-access", title: "Early Access", body: <p>The platform is currently in early access. Features may change, be paused or contain errors while we prepare for full launch. We appreciate your feedback.</p> },
  { id: "accounts", title: "Your Account", body: <ul>
    <li>You must be at least 18 and provide accurate information.</li>
    <li>One person per account; your role (candidate or recruiter) is chosen at sign-up.</li>
    <li>Keep your password safe. You are responsible for activity on your account.</li>
  </ul> },
  { id: "candidates", title: "Candidate Responsibilities", body: <ul>
    <li>Represent your skills, experience, education and certifications truthfully.</li>
    <li>Upload only resumes, photos and files you have the right to share.</li>
    <li>Apply only to roles you are genuinely interested in.</li>
  </ul> },
  { id: "recruiters", title: "Recruiter Responsibilities", body: <ul>
    <li>Post only real, currently available positions you are authorized to hire for.</li>
    <li>Describe pay, location and requirements accurately.</li>
    <li>Use candidate information only for recruiting, never resell or share it outside your hiring process.</li>
    <li>Follow applicable employment and anti-discrimination laws.</li>
    <li>Never ask candidates for payment to apply or be hired.</li>
  </ul> },
  { id: "matching", title: "Match Scores", body: <p>Match scores and career insights are automated guidance based on the information provided. They are not guarantees of suitability, employment or hiring outcomes. Recruiters remain responsible for their own hiring decisions.</p> },
  { id: "content", title: "Your Content", body: <p>You keep ownership of the content you add. You give Sundance Professionals permission to store, display and process it only as needed to operate the platform as described in our Privacy Policy.</p> },
  { id: "prohibited", title: "Prohibited Use", body: <ul>
    <li>Fake profiles, fake jobs, scams or impersonation.</li>
    <li>Harassment, discrimination, spam or unsolicited promotion.</li>
    <li>Scraping, copying data in bulk, or trying to bypass security or access rules.</li>
    <li>Uploading malware or illegal content.</li>
  </ul> },
  { id: "moderation", title: "Moderation & Suspension", body: <p>Anyone can report a profile, job or conversation. Moderators may review reports, pause job postings, or suspend accounts that break these Terms or our Community Guidelines, with or without prior notice where safety requires it.</p> },
  { id: "termination", title: "Ending Your Account", body: <p>You can permanently delete your account at any time in Settings. We may end access for serious or repeated violations.</p> },
  { id: "disclaimers", title: "Disclaimers & Liability", body: <p>The platform is provided "as is". We do not employ candidates or guarantee jobs, hires or the accuracy of user-provided information. To the extent allowed by law, Sundance Professionals is not liable for indirect or consequential losses arising from use of the platform.</p> },
  { id: "changes", title: "Changes To These Terms", body: <p>We may update these Terms. Continued use after changes take effect means you accept the updated Terms.</p> },
  { id: "contact", title: "Contact", body: <p>Questions about these Terms? Email <Mail />.</p> },
];

function Terms() {
  return <LegalPage eyebrow="Legal" title="Terms Of Service" desc="The rules that keep Sundance Professionals fair and useful for candidates and recruiters." sections={sections} />;
}
