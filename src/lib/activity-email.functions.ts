import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SITE = "https://sundanceprofessionals.com";

const input = z.object({
  kind: z.enum(["application", "message"]),
  id: z.string().uuid(),
});

/**
 * After the signed-in user applies, changes an application status, or sends a
 * message, email the other person the in-app alert that event created.
 * The caller must be the one who performed the action.
 */
export const sendActivityEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { shouldEmailAlert, alertActionLabel } = await import("./activity-email-rules");
    const { sendTemplateEmail } = await import("./email-templates/send-email");
    const me = context.userId;

    let recipient: string | null = null;
    let urlLike = "";
    if (data.kind === "application") {
      const { data: app } = await supabaseAdmin
        .from("applications")
        .select("application_id, candidate_id, jobs(recruiter_id)")
        .eq("application_id", data.id)
        .maybeSingle();
      const recruiterId = (app?.jobs as { recruiter_id: string } | null)?.recruiter_id;
      if (!app) return { sent: false };
      if (app.candidate_id === me) recipient = recruiterId ?? null;
      else if (recruiterId === me) recipient = app.candidate_id;
      urlLike = `%/applications/${data.id}`;
    } else {
      const { data: msg } = await supabaseAdmin
        .from("messages")
        .select("sender_id, conversation_id, conversations(candidate_id, recruiter_id)")
        .eq("message_id", data.id)
        .maybeSingle();
      const c = msg?.conversations as { candidate_id: string; recruiter_id: string } | null;
      if (!msg || !c || msg.sender_id !== me) return { sent: false };
      recipient = me === c.candidate_id ? c.recruiter_id : c.candidate_id;
      urlLike = `%/messages/${msg.conversation_id}`;
    }
    if (!recipient || recipient === me) return { sent: false };

    const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: n } = await supabaseAdmin
      .from("notifications")
      .select("notification_id, notification_type, title, message, action_url, group_count, status")
      .eq("recipient_id", recipient)
      .like("action_url", urlLike)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!n || !shouldEmailAlert(n)) return { sent: false };

    const { data: user } = await supabaseAdmin.auth.admin.getUserById(recipient);
    const email = user?.user?.email;
    if (!email) return { sent: false };

    try {
      const r = await sendTemplateEmail("activity-alert", email, {
        templateData: {
          title: n.title,
          message: n.message,
          actionUrl: n.action_url ? `${SITE}${n.action_url}` : SITE,
          actionLabel: alertActionLabel(n.notification_type),
        },
        idempotencyKey: `activity-alert-${n.notification_id}`,
      });
      return { sent: r.sent };
    } catch (e) {
      console.error("activity email failed", e);
      return { sent: false };
    }
  });
