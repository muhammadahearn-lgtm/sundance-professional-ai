import { describe, expect, it } from "vitest";
import { careerModeTag, inviteMessage } from "./candidate-invite";

describe("inviteMessage", () => {
  it("uses first name, job, company and up to three strengths", () => {
    expect(inviteMessage("Muhammad Ahearn", "Data Scientist", "Acme", ["Python", "SQL", "Snowflake", "R"]))
      .toBe("Hi Muhammad, I'd love for you to apply to our Data Scientist role at Acme. Your experience with Python, SQL and Snowflake stood out. Would you be open to taking a look?");
  });
  it("omits the strengths sentence when none match", () => {
    expect(inviteMessage("Ana", "Engineer", "Acme", [])).toBe("Hi Ana, I'd love for you to apply to our Engineer role at Acme. Would you be open to taking a look?");
  });
});

describe("careerModeTag", () => {
  it("maps passive mode to Open to the Right Opportunity", () => expect(careerModeTag("passive").label).toBe("Open to the Right Opportunity"));
  it("defaults to Actively Looking", () => expect(careerModeTag(undefined).label).toBe("Actively Looking"));
});
