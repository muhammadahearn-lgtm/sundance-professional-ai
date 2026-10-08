import { describe, it, expect } from "vitest";
import { resolveInstitution } from "./institution-aliases";

describe("institution aliases", () => {
  it("maps MIT to its full name", () => expect(resolveInstitution("MIT")).toBe("Massachusetts Institute Of Technology"));
  it("is case/space-insensitive", () => expect(resolveInstitution("  ucla ")).toBe("University Of California, Los Angeles"));
  it("returns null for unknown names", () => expect(resolveInstitution("Some Local College")).toBeNull());
});
