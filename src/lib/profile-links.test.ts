import { describe, expect, it } from "vitest";
import { displayLink, normalizeLink, validateLinks } from "./profile-links";

describe("profile links", () => {
  it("empty link is allowed (links are optional)", () => expect(normalizeLink("  ")).toBe(""));
  it("adds https when missing", () => expect(normalizeLink("github.com/dreyes")).toBe("https://github.com/dreyes"));
  it("rejects text that is not a link", () => expect(normalizeLink("my profile")).toBeNull());
  it("display drops protocol and www", () => expect(displayLink("https://www.linkedin.com/in/x")).toBe("linkedin.com/in/x"));
  it("reports an error only for the bad field", () => {
    const r = validateLinks({ linkedin_url: "linkedin.com/in/a", github_url: "nope", portfolio_url: "" });
    expect(Object.keys(r.errors)).toEqual(["github_url"]);
  });
});
