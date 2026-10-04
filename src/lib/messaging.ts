/** Pure messaging rules (no I/O) so they can be unit-tested. */
export const MESSAGE_MAX = 5000;
export const ATTACH_MAX = 10 * 1024 * 1024;
export const ATTACH_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

export function validateMessage(body: string, hasAttachment = false): string | null {
  if (body.length > MESSAGE_MAX) return `Messages can be up to ${MESSAGE_MAX.toLocaleString()} characters.`;
  if (!body.trim() && !hasAttachment) return "Write a message or attach a file.";
  return null;
}

export function validateAttachment(f: { name: string; size: number; type: string }): string | null {
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ATTACH_TYPES[f.type] && !["pdf", "docx"].includes(ext)) return "Only PDF and DOCX files are supported.";
  if (f.size > ATTACH_MAX) return "Files can be up to 10 MB.";
  return null;
}

/** Candidates may message only after applying to the job, or when the recruiter started the thread. */
export function candidateCanMessage(applied: boolean, conversationExists: boolean): boolean {
  return applied || conversationExists;
}

export type InboxFilter = "all" | "unread" | "active" | "archived";
export type InboxRow = {
  conversation_id: string; candidate_id: string; recruiter_id: string; job_id: string | null; archived: boolean; unread: number;
  candidate_name: string; recruiter_name: string; company_name: string; job_title: string | null; last_message_preview: string; conversation_status: string;
};

/** Active inbox hides archived threads; search covers names, job, company, last message and message-text hits. */
export function filterInbox(rows: InboxRow[], o: { filter: InboxFilter; q: string; job?: string; person?: string; textHits?: Set<string> }) {
  const q = o.q.trim().toLowerCase();
  return rows.filter((r) => {
    if (o.filter === "archived" ? !r.archived : r.archived) return false;
    if (o.filter === "unread" && !r.unread) return false;
    if (o.filter === "active" && r.conversation_status !== "active") return false;
    if (o.job && r.job_id !== o.job) return false;
    if (o.person && r.candidate_id !== o.person && r.recruiter_id !== o.person) return false;
    if (!q) return true;
    const hay = [r.candidate_name, r.recruiter_name, r.job_title ?? "", r.company_name, r.last_message_preview].join(" ").toLowerCase();
    return hay.includes(q) || !!o.textHits?.has(r.conversation_id);
  });
}

export const unreadConversations = (rows: { unread: number; archived: boolean }[]) => rows.filter((r) => r.unread > 0).length;

const URL_RE = /(https?:\/\/[^\s<]+)/g;
/** Split text into plain and link parts for safe rendering. */
export function linkify(text: string): { text: string; href?: string }[] {
  return text.split(URL_RE).filter(Boolean).map((p) => (/^https?:\/\//.test(p) ? { text: p, href: p } : { text: p }));
}
