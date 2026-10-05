import { describe, expect, it } from "vitest";
import { normalizeUrl, validateLinks } from "./profile-links";

describe("profile links", () => {
  it("links are optional", () => expect(normalizeUrl("  ")).toBe(""));
  it("adds https when missing", () => expect(normalizeUrl("github.com/jane")).toBe("https://github.com/jane"));
  it("rejects non-urls", () => expect(normalizeUrl("not a link")).toBeNull());
  it("reports which link is invalid", () => {
    const r = validateLinks({ linkedin_url: "linkedin.com/in/x", github_url: "nope", portfolio_url: "" });
    expect(r).toEqual({ ok: false, error: "Enter a valid GitHub link." });
  });
});
