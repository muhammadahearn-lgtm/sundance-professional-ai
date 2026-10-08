import { describe, it, expect } from "vitest";
import { resolveFieldOfStudy } from "./education-field-aliases";

describe("field of study aliases", () => {
  it("maps CS to Computer Science", () => expect(resolveFieldOfStudy("CS")).toBe("Computer Science"));
  it("maps EE to Electrical Engineering", () => expect(resolveFieldOfStudy(" ee ")).toBe("Electrical Engineering"));
  it("returns null for unlisted majors", () => expect(resolveFieldOfStudy("Marine Archaeology")).toBeNull());
});
