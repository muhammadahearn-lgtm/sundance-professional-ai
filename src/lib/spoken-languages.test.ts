import { describe, expect, it } from "vitest";
import { normalizeSpokenLanguage } from "./spoken-languages";

describe("normalizeSpokenLanguage", () => {
  it("maps Bahasa Indonesia to Indonesian", () => expect(normalizeSpokenLanguage("Bahasa Indonesia")).toBe("Indonesian"));
  it("maps Indonesia to Indonesian", () => expect(normalizeSpokenLanguage("indonesia")).toBe("Indonesian"));
  it("maps Farsi to Persian", () => expect(normalizeSpokenLanguage("Farsi")).toBe("Persian"));
  it("keeps unknown languages as typed", () => expect(normalizeSpokenLanguage(" Klingon ")).toBe("Klingon"));
});
