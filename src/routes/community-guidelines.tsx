import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, Mail, legalHead, type LegalSection } from "@/components/site/LegalPage";

export const Route = createFileRoute("/community-guidelines")({
  head: () => legalHead("Community Guidelines — Sundance Professionals", "How candidates and recruiters keep Sundance Professionals respectful, honest and safe, and how to report problems.", "/community-guidelines"),
  component: Guidelines,
});

const sections: LegalSection[] = [
  { id: "spirit", title: "Our Standard", body: <p>Sundance Professionals is a professional space. Treat everyone the way you would in a real interview: honest, respectful and focused on the work.</p> },
  { id: "respect", title: "Be Respectful", body: <ul>
    <li>No harassment, threats, insults or unwanted personal advances.</li>
    <li>No discrimination based on race, ethnicity, religion, gender, sexual orientation, age, disability or nationality.</li>
    <li>Keep messages about work and opportunities.</li>
  </ul> },
  { id: "honest", title: "Be Honest", body: <ul>
    <li>Use your real identity and accurate qualifications.</li>
    <li>Recruiters: post genuine jobs with accurate details.</li>
    <li>No scams, fake offers, or requests for payment, bank details or ID documents through messages.</li>
  </ul> },
  { id: "privacy", title: "Respect Privacy", body: <ul>
    <li>Do not share other people's personal information outside the platform.</li>
    <li>Do not pressure anyone to move to private channels before they are comfortable.</li>
  </ul> },
  { id: "not-allowed", title: "Zero-Tolerance Content", body: <ul>
    <li>Explicit, violent or hateful content.</li>
    <li>Spam, mass unsolicited outreach or advertising unrelated to hiring.</li>
    <li>Malicious links or files.</li>
  </ul> },
  { id: "report", title: "How To Report", body: <>
    <p>Use the <strong>Report</strong> button on a job, a candidate profile or a conversation. Pick a reason and add optional details. Reports are private: the person you report is not told who reported them.</p>
    <p>For urgent safety concerns, email <Mail />. If someone is in immediate danger, contact local emergency services.</p>
  </> },
  { id: "enforcement", title: "What Happens Next", body: <ul>
    <li>A moderator reviews every report.</li>
    <li>Depending on severity, we may take no action, pause a job, or suspend an account.</li>
    <li>Serious or repeated violations lead to permanent removal.</li>
  </ul> },
];

function Guidelines() {
  return <LegalPage eyebrow="Trust & Safety" title="Community Guidelines" desc="Simple rules that keep Sundance Professionals respectful, honest and safe for everyone." sections={sections} />;
}
