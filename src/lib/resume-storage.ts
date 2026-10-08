// Stores a candidate's resume file in the private `resumes` bucket so recruiters can download it.
import { supabase } from "@/integrations/supabase/client";

/** Only PDF/DOCX are kept as the recruiter-downloadable resume. */
export function isStorableResume(file: { name: string }) {
  return /\.(pdf|docx)$/i.test(file.name);
}

/** Uploads the file and returns its storage path, or null on failure. */
export async function uploadResumeFile(uid: string, file: File): Promise<string | null> {
  const safe = file.name.replace(/[^\w.-]+/g, "_").slice(-80);
  const path = `${uid}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from("resumes").upload(path, file, { contentType: file.type || "application/octet-stream" });
  return error ? null : path;
}
