import { describe, expect, it } from "vitest";
import { validateAvatar } from "./avatar";
describe("validateAvatar", () => {
  it("accepts a 5 MB JPG", () => expect(validateAvatar({ type: "image/jpeg", size: 5 * 1024 * 1024 })).toBeNull());
  it("rejects over 5 MB", () => expect(validateAvatar({ type: "image/png", size: 5 * 1024 * 1024 + 1 })).not.toBeNull());
  it("rejects non-images", () => expect(validateAvatar({ type: "application/pdf", size: 10 })).not.toBeNull());
});
