import { describe, expect, it } from "vitest";
import { isDuplicateEmail, stageAlertsTeam, stakeholderSchema } from "./hiring-team";

describe("hiring team", () => {
  it("alerts the team only for shortlisted, offer and hired", () => {
    expect(stageAlertsTeam("shortlisted")).toBe(true);
    expect(stageAlertsTeam("offer")).toBe(true);
    expect(stageAlertsTeam("hired")).toBe(true);
    expect(stageAlertsTeam("contacted")).toBe(false);
    expect(stageAlertsTeam("rejected")).toBe(false);
  });
  it("requires a valid email", () => {
    expect(stakeholderSchema.safeParse({ name: "John", hiring_role: "Hiring Manager", email: "john@" }).success).toBe(false);
    expect(stakeholderSchema.parse({ name: " John ", hiring_role: "Hiring Manager", email: "John@Gmail.com" }).email).toBe("john@gmail.com");
  });
  it("blocks the same email twice on a job, ignoring case", () => {
    expect(isDuplicateEmail([{ email: "john@gmail.com" }], "JOHN@gmail.com ")).toBe(true);
  });
});
