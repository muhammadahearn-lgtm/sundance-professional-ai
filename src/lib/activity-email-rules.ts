/** Which in-app alerts also go out by email, and the button label for each. */
const EMAIL_TYPES: Record<string, string> = {
  new_application: "Review application",
  application_recruiter_contacted: "View application",
  application_interviewing: "View application",
  application_offer: "View application",
  application_hired: "View application",
  application_rejected: "View application",
  new_conversation: "Open conversation",
  new_message: "Open conversation",
  candidate_replied: "Open conversation",
  attachment_received: "Open conversation",
};

export interface AlertRow { notification_type: string; group_count: number; status: string }

/**
 * An alert is emailed only for important activity types, and for messages only
 * the first unread one in a conversation (later ones are grouped, no extra email).
 */
export function shouldEmailAlert(n: AlertRow): boolean {
  if (!(n.notification_type in EMAIL_TYPES)) return false;
  if (n.status !== "unread") return false;
  return n.group_count <= 1;
}

export function alertActionLabel(type: string): string {
  return EMAIL_TYPES[type] ?? "Open Sundance Professionals";
}
