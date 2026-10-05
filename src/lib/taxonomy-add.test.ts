import { describe, expect, it } from "vitest";
import { newEntryName } from "./taxonomy-add";

const opts = [{ name: "Python" }, { name: "Machine Learning" }];
describe("newEntryName", () => {
  it("offers a Title Case name for new entries", () => expect(newEntryName("  data   engineering ", opts)).toBe("Data Engineering"));
  it("hides the add option when the entry already exists in any casing", () => expect(newEntryName("MACHINE LEARNING", opts)).toBeNull());
  it("rejects empty and over-60-character names", () => {
    expect(newEntryName("   ", opts)).toBeNull();
    expect(newEntryName("a".repeat(61), opts)).toBeNull();
  });
});
