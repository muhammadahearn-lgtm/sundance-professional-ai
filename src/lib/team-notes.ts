import { supabase } from "@/integrations/supabase/client";

export const NOTE_MAX = 2000;

export type TeamNote = { note_id: string; author_id: string; author_name: string; job_id: string | null; job_title: string | null; content: string; created_at: string; updated_at: string };

/** Returns an error message, or null when the note can be saved. */
export function validateNote(text: string): string | null {
  const t = text.trim();
  if (!t) return "Write something first.";
  if (t.length > NOTE_MAX) return `Notes must be under ${NOTE_MAX} characters.`;
  return null;
}

export function canEditNote(note: Pick<TeamNote, "author_id">, uid: string): boolean {
  return note.author_id === uid;
}

export async function listTeamNotes(candidateId: string): Promise<TeamNote[]> {
  const { data, error } = await supabase.rpc("candidate_notes_feed", { _candidate: candidateId });
  if (error) throw error;
  return (data ?? []) as TeamNote[];
}

export async function addTeamNote(candidateId: string, content: string, jobId: string | null) {
  const { error } = await supabase.from("candidate_notes").insert({ candidate_id: candidateId, content: content.trim(), job_id: jobId });
  if (error) throw error;
}

export async function updateTeamNote(noteId: string, content: string) {
  const { error } = await supabase.from("candidate_notes").update({ content: content.trim() }).eq("note_id", noteId);
  if (error) throw error;
}

export async function deleteTeamNote(noteId: string) {
  const { error } = await supabase.from("candidate_notes").delete().eq("note_id", noteId);
  if (error) throw error;
}
