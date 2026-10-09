import { describe, expect, it } from "vitest";
import { inTriageTab, triageBucket } from "./application-triage";

describe("application triage", () => {
  it("viewed applicants stay in the Inbox", () => {
    expect(triageBucket("applied", false)).toBe("inbox");
    expect(triageBucket("viewed", false)).toBe("inbox");
  });
  it("moving to the pipeline leaves the Inbox", () => {
    expect(triageBucket("viewed", true)).toBe("pipeline");
    expect(inTriageTab("inbox", "viewed", true)).toBe(false);
  });
  it("not moving forward goes to Archived even if on the board", () => {
    expect(triageBucket("rejected", true)).toBe("archived");
  });
  it("All shows everyone", () => {
    expect(inTriageTab("all", "rejected", false)).toBe(true);
  });
});
