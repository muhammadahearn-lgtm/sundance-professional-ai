import { describe, it, expect } from "vitest";
import { shouldEmailAlert } from "./activity-email-rules";

describe("activity emails", () => {
  it("emails recruiters about a new application", () => {
    expect(shouldEmailAlert({ notification_type: "new_application", group_count: 1, status: "unread" })).toBe(true);
  });
  it("emails candidates when they move to interviewing", () => {
    expect(shouldEmailAlert({ notification_type: "application_interviewing", group_count: 1, status: "unread" })).toBe(true);
  });
  it("emails only the first unread message in a conversation", () => {
    expect(shouldEmailAlert({ notification_type: "new_message", group_count: 1, status: "unread" })).toBe(true);
    expect(shouldEmailAlert({ notification_type: "new_message", group_count: 2, status: "unread" })).toBe(false);
  });
  it("does not email low-value alerts like 'viewed' or pipeline moves", () => {
    expect(shouldEmailAlert({ notification_type: "application_viewed", group_count: 1, status: "unread" })).toBe(false);
    expect(shouldEmailAlert({ notification_type: "pipeline_stage_change", group_count: 1, status: "unread" })).toBe(false);
  });
});
