import { describe, expect, it } from "vitest";
import { candidateCanMessage, filterInbox, linkify, validateAttachment, validateMessage, type InboxRow } from "./messaging";

const row = (o: Partial<InboxRow>): InboxRow => ({ conversation_id: "c", candidate_id: "a", recruiter_id: "r", job_id: null, archived: false, unread: 0, candidate_name: "John Smith", recruiter_name: "Rita", company_name: "Acme", job_title: "Data Engineer", last_message_preview: "", conversation_status: "active", ...o });

describe("messaging rules", () => {
  it("limits messages to 5,000 characters", () => {
    expect(validateMessage("x".repeat(5000))).toBeNull();
    expect(validateMessage("x".repeat(5001))).not.toBeNull();
  });
  it("accepts only PDF/DOCX up to 10 MB", () => {
    expect(validateAttachment({ name: "cv.pdf", size: 10 * 1024 * 1024, type: "application/pdf" })).toBeNull();
    expect(validateAttachment({ name: "cv.pdf", size: 10 * 1024 * 1024 + 1, type: "application/pdf" })).not.toBeNull();
    expect(validateAttachment({ name: "pic.png", size: 10, type: "image/png" })).not.toBeNull();
  });
  it("candidates need an application or a recruiter-started thread", () => {
    expect(candidateCanMessage(false, false)).toBe(false);
    expect(candidateCanMessage(true, false)).toBe(true);
    expect(candidateCanMessage(false, true)).toBe(true);
  });
  it("hides archived threads from the active inbox", () => {
    const rows = [row({ conversation_id: "1" }), row({ conversation_id: "2", archived: true })];
    expect(filterInbox(rows, { filter: "all", q: "" }).map((r) => r.conversation_id)).toEqual(["1"]);
    expect(filterInbox(rows, { filter: "archived", q: "" }).map((r) => r.conversation_id)).toEqual(["2"]);
  });
  it("searches names and message text", () => {
    const rows = [row({ conversation_id: "1" }), row({ conversation_id: "2", candidate_name: "Jane" })];
    expect(filterInbox(rows, { filter: "all", q: "smith" }).map((r) => r.conversation_id)).toEqual(["1"]);
    expect(filterInbox(rows, { filter: "all", q: "kafka", textHits: new Set(["2"]) }).map((r) => r.conversation_id)).toEqual(["2"]);
  });
  it("turns URLs into links", () => {
    expect(linkify("see https://x.io now")).toEqual([{ text: "see " }, { text: "https://x.io", href: "https://x.io" }, { text: " now" }]);
  });
});
