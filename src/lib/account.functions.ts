import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Permanently delete the signed-in user's account and data. */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const id = context.userId;
    // Remove the user's own uploaded files (photo, resume, company images).
    for (const bucket of ["avatars", "resumes", "company-branding"]) {
      const { data: files } = await supabaseAdmin.storage.from(bucket).list(id, { limit: 1000 });
      const paths = (files ?? []).map((f) => `${id}/${f.name}`);
      if (paths.length) await supabaseAdmin.storage.from(bucket).remove(paths);
    }
    await supabaseAdmin.from("reports").delete().eq("reporter_id", id);
    await supabaseAdmin.from("candidate_profiles").delete().eq("user_id", id);
    await supabaseAdmin.from("recruiter_profiles").delete().eq("user_id", id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", id);
    await supabaseAdmin.from("profiles").delete().eq("user_id", id);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
