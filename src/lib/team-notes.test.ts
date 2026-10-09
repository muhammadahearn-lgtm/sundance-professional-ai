import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { canEditNote, NOTE_MAX, validateNote } from "./team-notes";

describe("team notes rules", () => {
  it("rejects empty or whitespace notes", () => {
    expect(validateNote("   ")).not.toBeNull();
  });
  it("rejects notes over 2000 characters", () => {
    expect(NOTE_MAX).toBe(2000);
    expect(validateNote("a".repeat(2001))).not.toBeNull();
    expect(validateNote("a".repeat(2000))).toBeNull();
  });
  it("only the author can edit or delete", () => {
    expect(canEditNote({ author_id: "u1" }, "u1")).toBe(true);
    expect(canEditNote({ author_id: "u1" }, "u2")).toBe(false);
  });
});
