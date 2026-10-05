import { describe, it, expect } from "vitest";
import { taxonomyDisplay, taxonomyKey, findExisting } from "./taxonomy";

describe("taxonomy normalization", () => {
  it("title-cases lowercase input", () => expect(taxonomyDisplay("machine learning")).toBe("Machine Learning"));
  it("title-cases all-caps phrases", () => expect(taxonomyDisplay("MACHINE LEARNING")).toBe("Machine Learning"));
  it("trims and collapses spaces", () => expect(taxonomyDisplay("  stakeholder   management ")).toBe("Stakeholder Management"));
  it("keeps acronyms and brand casing", () => { expect(taxonomyDisplay("AWS")).toBe("AWS"); expect(taxonomyDisplay("PowerShell")).toBe("PowerShell"); });
  it("builds the normalized key", () => expect(taxonomyKey("Stakeholder Management")).toBe("stakeholder_management"));
  it("reuses existing entries regardless of casing", () => {
    const items = [{ n: "Communication" }];
    expect(findExisting(items, (i) => i.n, " COMMUNICATION")).toBe(items[0]);
  });
});
