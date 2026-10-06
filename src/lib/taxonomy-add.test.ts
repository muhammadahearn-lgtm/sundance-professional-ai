import { describe, expect, it } from "vitest";
import { canAddTaxonomy, newEntryName } from "./taxonomy-add";

const opts = [{ name: "Python" }, { name: "Machine Learning" }];
describe("newEntryName", () => {
  it("offers a Title Case name for new entries", () => expect(newEntryName("  data   engineering ", opts)).toBe("Data Engineering"));
  it("hides the add option when the entry already exists in any casing", () => expect(newEntryName("MACHINE LEARNING", opts)).toBeNull());
  it("rejects empty and over-60-character names", () => {
    expect(newEntryName("   ", opts)).toBeNull();
    expect(newEntryName("a".repeat(61), opts)).toBeNull();
  });
});

describe("canAddTaxonomy", () => {
  it("blocks custom programming languages", () => expect(canAddTaxonomy("language")).toBe(false));
  it("allows custom skills, technologies and soft skills", () => {
    expect(canAddTaxonomy("skill")).toBe(true);
    expect(canAddTaxonomy("technology")).toBe(true);
    expect(canAddTaxonomy("soft_skill")).toBe(true);
  });
});

import { crossCategoryMatch } from "./taxonomy-add";
describe("crossCategoryMatch", () => {
  const techs = [{ id: "t1", name: "AWS" }, { id: "t2", name: "Docker" }];
  it("finds a term that already lives in the other category, any casing", () => expect(crossCategoryMatch("  aws ", techs)?.id).toBe("t1"));
  it("returns null for terms not in the other category", () => expect(crossCategoryMatch("Machine Learning", techs)).toBeNull());
});
