import { describe, expect, it } from "vitest";
import { formatLocation, locationAlignment, locationKey, normalizeLocationPart, validateLocation } from "./location";

describe("location governance", () => {
  it("normalizes casing and spaces to Title Case", () => {
    expect(normalizeLocationPart("new hampshire")).toBe("New Hampshire");
    expect(normalizeLocationPart("  NEW   HAMPSHIRE ")).toBe("New Hampshire");
    expect(normalizeLocationPart("BOW")).toBe("Bow");
  });
  it("builds normalized keys", () => {
    expect(locationKey("New Hampshire")).toBe("new_hampshire");
    expect(locationKey("Boston")).toBe("boston");
  });
  it("formats City, State, Country", () => {
    expect(formatLocation({ city: "boston", state: "MASSACHUSETTS", country: "United States" })).toBe("Boston, Massachusetts, United States");
  });
  it("requires a listed country, state and city", () => {
    expect(validateLocation({ country: "Atlantis", state: "X", city: "Y" }, ["Canada"])).not.toBeNull();
    expect(validateLocation({ country: "Canada", state: "", city: "Toronto" }, ["Canada"])).not.toBeNull();
    expect(validateLocation({ country: "Canada", state: "Ontario", city: "Toronto" }, ["Canada"])).toBeNull();
  });
  it("labels location alignment", () => {
    const bos = { city: "Boston", state: "Massachusetts", country: "United States" };
    expect(locationAlignment(bos, bos, "on_site")).toBe("strong");
    expect(locationAlignment({ ...bos, city: "Worcester" }, bos, "on_site")).toBe("partial");
    expect(locationAlignment({ city: "Toronto", state: "Ontario", country: "Canada" }, bos, "on_site")).toBe("conflict");
  });
});
